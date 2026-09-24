import { NextRequest, NextResponse, after } from "next/server";
import type OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { openai } from "@/lib/openai";
import { getUserFromRequest } from "@/lib/auth";
import { generateRecipeImage } from "@/lib/nanoBanana";
import { validateRecipeInput } from "@/lib/recipeInput";
import { isRateLimited } from "@/lib/rateLimit";
import { withTimeout } from "@/lib/withTimeout";

const CHAT_MODEL = "gpt-4o-mini";
const MAX_MESSAGE_LENGTH = 4000;
const RATE_LIMIT_PER_HOUR = 20;
const FREE_PLAN_DAILY_MESSAGE_LIMIT = 5;
/** How many past messages the model is given, and the UI shows. */
const HISTORY_WINDOW = 50;
/** Upstream budgets: the reply is worth waiting for, the photo isn't. */
const CHAT_TIMEOUT_MS = 30_000;
const IMAGE_TIMEOUT_MS = 25_000;

const SYSTEM_PROMPT = `You are Chef Ferraro, a helpful cooking assistant.
You help users find and create recipes. Be friendly and helpful.
Try to give recipe suggestions when asked.

When a user asks you to create/save a recipe, call the create_recipe tool with
the recipe details instead of describing it as plain text.`;

const RECIPE_TOOL: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "create_recipe",
    description: "Create and save a new recipe to the user's recipe catalog.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        prepTime: { type: "number", description: "Prep time in minutes" },
        cookTime: { type: "number", description: "Cook time in minutes" },
        servings: { type: "number" },
        calories: { type: "number" },
        cuisine: { type: "string" },
        dietaryTags: {
          type: "array",
          items: { type: "string" },
          description: "e.g. vegan, gluten-free",
        },
        ingredients: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              amount: { type: "string" },
              unit: { type: "string" },
            },
            required: ["name"],
          },
        },
        imagePrompt: {
          type: "string",
          description:
            "A short visual description of the finished dish, for image generation",
        },
      },
      required: [
        "title",
        "description",
        "prepTime",
        "cookTime",
        "servings",
        "ingredients",
      ],
    },
  },
};

function startOfTodayUtc(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * What's left of today's allowance. Counted the same way the POST handler
 * enforces it, so the number shown and the number applied can't drift apart.
 */
async function dailyQuota(userId: string, plan: string) {
  if (plan === "pro") {
    return {
      plan,
      limit: null as number | null,
      used: 0,
      remaining: null as number | null,
    };
  }

  const used = await prisma.chatMessage.count({
    where: { userId, role: "user", createdAt: { gte: startOfTodayUtc() } },
  });

  return {
    plan,
    limit: FREE_PLAN_DAILY_MESSAGE_LIMIT,
    used,
    remaining: Math.max(0, FREE_PLAN_DAILY_MESSAGE_LIMIT - used),
  };
}

/** The transcript the model is working from, plus what's left of the quota. */
export async function GET(req: NextRequest) {
  const session = getUserFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Newest 50, back in reading order — the same window POST sends the model.
  const recent = await prisma.chatMessage.findMany({
    where: { userId: session.userId, archived: false },
    orderBy: { createdAt: "desc" },
    take: HISTORY_WINDOW,
  });

  return NextResponse.json({
    model: CHAT_MODEL,
    messages: [...recent].reverse().map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt,
    })),
    quota: await dailyQuota(session.userId, user.plan),
  });
}

export async function POST(req: NextRequest) {
  const session = getUserFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { message } = body as { message?: unknown };
  if (typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: `message cannot exceed ${MAX_MESSAGE_LENGTH} characters` },
      { status: 400 }
    );
  }

  if (
    await isRateLimited(session.userId, RATE_LIMIT_PER_HOUR, 60 * 60 * 1000)
  ) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down and try again shortly." },
      { status: 429 }
    );
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (user.plan !== "pro") {
    const todayMessageCount = await prisma.chatMessage.count({
      where: {
        userId: session.userId,
        role: "user",
        createdAt: { gte: startOfTodayUtc() },
      },
    });
    if (todayMessageCount >= FREE_PLAN_DAILY_MESSAGE_LIMIT) {
      return NextResponse.json(
        {
          error: `Free plan is limited to ${FREE_PLAN_DAILY_MESSAGE_LIMIT} Recipe Bot messages per day. Upgrade to Pro for unlimited access.`,
        },
        { status: 403 }
      );
    }
  }

  await prisma.chatMessage.create({
    data: { role: "user", content: message, userId: session.userId },
  });

  const recent = await prisma.chatMessage.findMany({
    where: { userId: session.userId, archived: false },
    orderBy: { createdAt: "desc" },
    take: HISTORY_WINDOW,
  });
  const history = [...recent].reverse();

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  let completion;
  try {
    completion = await openai.chat.completions.create(
      {
        model: CHAT_MODEL,
        messages,
        tools: [RECIPE_TOOL],
        tool_choice: "auto",
      },
      { timeout: CHAT_TIMEOUT_MS }
    );
  } catch (err) {
    console.error("OpenAI chat completion failed:", err);
    return NextResponse.json(
      {
        error:
          "Chef Ferraro is unavailable right now. Please try again shortly.",
      },
      { status: 502 }
    );
  }

  const responseMessage = completion.choices[0].message;
  const toolCall = responseMessage.tool_calls?.[0];

  let assistantReply: string;
  let createdRecipe = null;

  if (
    toolCall &&
    toolCall.type === "function" &&
    toolCall.function.name === "create_recipe"
  ) {
    let args: Record<string, unknown>;
    try {
      args = JSON.parse(toolCall.function.arguments);
    } catch (err) {
      console.error("Failed to parse create_recipe tool arguments:", err);
      assistantReply =
        "I tried to save that recipe but the details came back malformed. Could you try again?";
      await prisma.chatMessage.create({
        data: {
          role: "assistant",
          content: assistantReply,
          userId: session.userId,
        },
      });
      return NextResponse.json({
        message: assistantReply,
        recipe: null,
        model: CHAT_MODEL,
      });
    }

    const validated = validateRecipeInput(args);
    if ("error" in validated) {
      console.error("Recipe tool call failed validation:", validated.error);
      assistantReply = `I couldn't save that recipe (${validated.error}). Could you give me a bit more detail?`;
    } else {
      try {
        createdRecipe = await prisma.recipe.create({
          data: {
            title: validated.title!,
            description: validated.description!,
            imageUrl: "/images/recipes/classic-pancakes.jpg",
            prepTime: validated.prepTime!,
            cookTime: validated.cookTime!,
            servings: validated.servings!,
            calories: validated.calories ?? null,
            cuisine: validated.cuisine ?? null,
            dietaryTags: validated.dietaryTags ?? null,
            userId: session.userId,
            ingredients: { create: validated.ingredients! },
          },
          include: { ingredients: true },
        });

        assistantReply = `I've created "${createdRecipe.title}" and added it to your recipe catalog!`;

        // "AI-generated photos for every recipe" is sold as a Pro feature, and
        // each call costs money — so free accounts keep the placeholder.
        if (user.plan === "pro") {
          const imagePromptRaw = args.imagePrompt ?? args.image_prompt;
          const imagePrompt =
            typeof imagePromptRaw === "string" && imagePromptRaw.trim()
              ? imagePromptRaw
              : `A delicious ${createdRecipe.title}`;
          const recipeId = createdRecipe.id;

          // Generated *after* the response is sent. Image generation takes
          // tens of seconds, and the recipe is already saved — the reply
          // shouldn't wait on a photo. The catalog picks it up on next load.
          after(async () => {
            try {
              const imageUrl = await withTimeout(
                generateRecipeImage(imagePrompt),
                IMAGE_TIMEOUT_MS,
                "Recipe image generation"
              );
              await prisma.recipe.update({
                where: { id: recipeId },
                data: { imageUrl },
              });
            } catch (err) {
              // The seeded placeholder stays; nothing user-facing breaks.
              console.error("Recipe image generation failed:", err);
            }
          });
        }
      } catch (err) {
        console.error("Failed to persist recipe from chat tool call:", err);
        assistantReply = "I had trouble saving that recipe. Please try again.";
      }
    }
  } else {
    assistantReply =
      responseMessage.content ||
      "Sorry, I didn't catch that — could you rephrase?";
  }

  await prisma.chatMessage.create({
    data: {
      role: "assistant",
      content: assistantReply,
      userId: session.userId,
    },
  });

  return NextResponse.json({
    message: assistantReply,
    recipe: createdRecipe,
    model: CHAT_MODEL,
    quota: await dailyQuota(session.userId, user.plan),
  });
}

/**
 * Start a new conversation.
 *
 * Archives rather than deletes: the free-plan daily limit is enforced by
 * counting stored messages, so deleting them would hand the allowance back and
 * make the paywall trivially bypassable. Archived rows drop out of the
 * transcript and the model's context, and still count toward the quota.
 */
export async function DELETE(req: NextRequest) {
  const session = getUserFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { count } = await prisma.chatMessage.updateMany({
    where: { userId: session.userId, archived: false },
    data: { archived: true },
  });

  return NextResponse.json({ success: true, archived: count });
}
