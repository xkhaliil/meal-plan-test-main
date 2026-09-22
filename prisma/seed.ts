import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.chatMessage.deleteMany();
  await prisma.mealPlanRecipe.deleteMany();
  await prisma.mealPlan.deleteMany();
  await prisma.ingredient.deleteMany();
  await prisma.recipe.deleteMany();
  await prisma.user.deleteMany();

  const alice = await prisma.user.create({
    data: {
      email: "alice@example.com",
      password: "password123",
      name: "Alice Johnson",
      plan: "pro",
    },
  });

  const bob = await prisma.user.create({
    data: {
      email: "bob@example.com",
      password: "bob2024",
      name: "Bob Smith",
      plan: "free",
    },
  });

  const charlie = await prisma.user.create({
    data: {
      email: "charlie@example.com",
      password: "letmein",
      name: "Charlie Davis",
      plan: "free",
    },
  });

  const recipesData = [
    {
      title: "Classic Pancakes",
      description:
        "Fluffy buttermilk pancakes perfect for a weekend breakfast. Golden brown and delicious with maple syrup.",
      imageUrl: "/images/recipes/classic-pancakes.jpg",
      prepTime: 10,
      cookTime: 15,
      servings: 4,
      calories: 350,
      cuisine: "American",
      dietaryTags: "vegetarian",
      ingredients: [
        { name: "All-purpose flour", amount: "2", unit: "cups" },
        { name: "Buttermilk", amount: "1.5", unit: "cups" },
        { name: "Eggs", amount: "2", unit: "large" },
        { name: "Butter", amount: "3", unit: "tbsp" },
        { name: "Sugar", amount: "2", unit: "tbsp" },
        { name: "Baking powder", amount: "2", unit: "tsp" },
        { name: "Salt", amount: "0.5", unit: "tsp" },
      ],
    },
    {
      title: "Grilled Salmon",
      description:
        "Cedar plank grilled salmon with a honey-mustard glaze. Restaurant quality at home.",
      imageUrl: "/images/recipes/grilled-salmon.jpg",
      prepTime: 15,
      cookTime: 20,
      servings: 2,
      calories: 480,
      cuisine: "American",
      dietaryTags: "gluten-free,high-protein",
      ingredients: [
        { name: "Salmon fillet", amount: "2", unit: "pieces" },
        { name: "Honey", amount: "2", unit: "tbsp" },
        { name: "Dijon mustard", amount: "1", unit: "tbsp" },
        { name: "Garlic", amount: "2", unit: "cloves" },
        { name: "Lemon", amount: "1", unit: "whole" },
        { name: "Olive oil", amount: "1", unit: "tbsp" },
      ],
    },
    {
      title: "Caesar Salad",
      description:
        "Crisp romaine lettuce with creamy Caesar dressing, croutons, and parmesan.",
      imageUrl: "/images/recipes/caesar-salad.jpg",
      prepTime: 15,
      cookTime: 0,
      servings: 4,
      calories: 220,
      cuisine: "Italian",
      dietaryTags: "vegetarian",
      ingredients: [
        { name: "Romaine lettuce", amount: "2", unit: "heads" },
        { name: "Parmesan cheese", amount: "0.5", unit: "cup" },
        { name: "Croutons", amount: "1", unit: "cup" },
        { name: "Caesar dressing", amount: "0.25", unit: "cup" },
        { name: "Lemon juice", amount: "1", unit: "tbsp" },
      ],
    },
    {
      title: "Beef Stew",
      description:
        "Hearty slow-cooked beef stew with root vegetables. Perfect comfort food for cold days.",
      imageUrl: "/images/recipes/beef-stew.jpg",
      prepTime: 20,
      cookTime: 120,
      servings: 6,
      calories: 450,
      cuisine: "American",
      dietaryTags: "gluten-free,high-protein",
      ingredients: [
        { name: "Beef chuck", amount: "2", unit: "lbs" },
        { name: "Potatoes", amount: "4", unit: "medium" },
        { name: "Carrots", amount: "3", unit: "large" },
        { name: "Onion", amount: "1", unit: "large" },
        { name: "Beef broth", amount: "4", unit: "cups" },
        { name: "Tomato paste", amount: "2", unit: "tbsp" },
        { name: "Worcestershire sauce", amount: "1", unit: "tbsp" },
      ],
    },
    {
      title: "Chicken Tikka Masala",
      description:
        "Creamy and aromatic Indian curry with tender chicken pieces in a rich tomato-based sauce.",
      imageUrl: "/images/recipes/chicken-tikka.jpg",
      prepTime: 30,
      cookTime: 35,
      servings: 4,
      calories: 520,
      cuisine: "Indian",
      dietaryTags: "gluten-free",
      ingredients: [
        { name: "Chicken breast", amount: "1.5", unit: "lbs" },
        { name: "Yogurt", amount: "1", unit: "cup" },
        { name: "Heavy cream", amount: "0.5", unit: "cup" },
        { name: "Tomato sauce", amount: "1", unit: "cup" },
        { name: "Garam masala", amount: "2", unit: "tsp" },
        { name: "Turmeric", amount: "1", unit: "tsp" },
        { name: "Cumin", amount: "1", unit: "tsp" },
        { name: "Garlic", amount: "4", unit: "cloves" },
        { name: "Ginger", amount: "1", unit: "inch" },
      ],
    },
    {
      title: "Pasta Carbonara",
      description:
        "Traditional Roman pasta with eggs, pecorino cheese, guanciale, and black pepper.",
      imageUrl: "/images/recipes/pasta-carbonara.jpg",
      prepTime: 10,
      cookTime: 20,
      servings: 4,
      calories: 580,
      cuisine: "Italian",
      dietaryTags: "",
      ingredients: [
        { name: "Spaghetti", amount: "1", unit: "lb" },
        { name: "Guanciale", amount: "6", unit: "oz" },
        { name: "Egg yolks", amount: "4", unit: "large" },
        { name: "Pecorino Romano", amount: "1", unit: "cup" },
        { name: "Black pepper", amount: "2", unit: "tsp" },
      ],
    },
    {
      title: "Veggie Stir Fry",
      description:
        "Colorful mix of fresh vegetables wok-tossed in a savory soy-ginger sauce.",
      imageUrl: "/images/recipes/veggie-stir-fry.jpg",
      prepTime: 15,
      cookTime: 10,
      servings: 3,
      calories: 280,
      cuisine: "Chinese",
      dietaryTags: "vegan,gluten-free",
      ingredients: [
        { name: "Broccoli", amount: "2", unit: "cups" },
        { name: "Bell peppers", amount: "2", unit: "medium" },
        { name: "Snap peas", amount: "1", unit: "cup" },
        { name: "Carrots", amount: "2", unit: "medium" },
        { name: "Soy sauce", amount: "3", unit: "tbsp" },
        { name: "Sesame oil", amount: "1", unit: "tbsp" },
        { name: "Ginger", amount: "1", unit: "tbsp" },
        { name: "Garlic", amount: "3", unit: "cloves" },
      ],
    },
    {
      title: "Chocolate Cake",
      description:
        "Rich and moist chocolate layer cake with dark chocolate ganache frosting.",
      imageUrl: "/images/recipes/chocolate-cake.jpg",
      prepTime: 25,
      cookTime: 35,
      servings: 12,
      calories: 480,
      cuisine: "American",
      dietaryTags: "vegetarian",
      ingredients: [
        { name: "All-purpose flour", amount: "2", unit: "cups" },
        { name: "Cocoa powder", amount: "0.75", unit: "cup" },
        { name: "Sugar", amount: "2", unit: "cups" },
        { name: "Eggs", amount: "3", unit: "large" },
        { name: "Buttermilk", amount: "1", unit: "cup" },
        { name: "Butter", amount: "0.5", unit: "cup" },
        { name: "Dark chocolate", amount: "8", unit: "oz" },
        { name: "Heavy cream", amount: "1", unit: "cup" },
      ],
    },
    {
      title: "French Toast",
      description:
        "Classic French toast with cinnamon and vanilla, served with fresh berries and powdered sugar.",
      imageUrl: "/images/recipes/french-toast.jpg",
      prepTime: 10,
      cookTime: 15,
      servings: 4,
      calories: 320,
      cuisine: "French",
      dietaryTags: "vegetarian",
      ingredients: [
        { name: "Thick bread", amount: "8", unit: "slices" },
        { name: "Eggs", amount: "4", unit: "large" },
        { name: "Milk", amount: "0.5", unit: "cup" },
        { name: "Vanilla extract", amount: "1", unit: "tsp" },
        { name: "Cinnamon", amount: "1", unit: "tsp" },
        { name: "Butter", amount: "2", unit: "tbsp" },
      ],
    },
    {
      title: "Mushroom Risotto",
      description:
        "Creamy Arborio rice slowly cooked with a medley of wild mushrooms and finished with parmesan.",
      imageUrl: "/images/recipes/mushroom-risotto.jpg",
      prepTime: 10,
      cookTime: 35,
      servings: 4,
      calories: 420,
      cuisine: "Italian",
      dietaryTags: "vegetarian,gluten-free",
      ingredients: [
        { name: "Arborio rice", amount: "1.5", unit: "cups" },
        { name: "Mixed mushrooms", amount: "12", unit: "oz" },
        { name: "Chicken broth", amount: "4", unit: "cups" },
        { name: "White wine", amount: "0.5", unit: "cup" },
        { name: "Parmesan cheese", amount: "0.5", unit: "cup" },
        { name: "Shallots", amount: "2", unit: "medium" },
        { name: "Butter", amount: "3", unit: "tbsp" },
      ],
    },
    {
      title: "Fish Tacos",
      description:
        "Baja-style fish tacos with crispy battered cod, lime crema, and fresh cabbage slaw.",
      imageUrl: "/images/recipes/fish-tacos.jpg",
      prepTime: 20,
      cookTime: 15,
      servings: 4,
      calories: 380,
      cuisine: "Mexican",
      dietaryTags: "",
      ingredients: [
        { name: "Cod fillets", amount: "1", unit: "lb" },
        { name: "Corn tortillas", amount: "8", unit: "small" },
        { name: "Cabbage", amount: "2", unit: "cups" },
        { name: "Sour cream", amount: "0.5", unit: "cup" },
        { name: "Lime", amount: "2", unit: "whole" },
        { name: "Cilantro", amount: "0.25", unit: "cup" },
        { name: "Flour", amount: "1", unit: "cup" },
        { name: "Beer", amount: "0.75", unit: "cup" },
      ],
    },
    {
      title: "Banana Smoothie",
      description:
        "Thick and creamy banana smoothie with peanut butter and honey. A perfect post-workout boost.",
      imageUrl: "/images/recipes/banana-smoothie.jpg",
      prepTime: 5,
      cookTime: 0,
      servings: 2,
      calories: 280,
      cuisine: "American",
      dietaryTags: "vegetarian,gluten-free",
      ingredients: [
        { name: "Bananas", amount: "2", unit: "large" },
        { name: "Milk", amount: "1", unit: "cup" },
        { name: "Peanut butter", amount: "2", unit: "tbsp" },
        { name: "Honey", amount: "1", unit: "tbsp" },
        { name: "Ice", amount: "1", unit: "cup" },
      ],
    },
    {
      title: "Greek Salad",
      description:
        "Fresh Mediterranean salad with tomatoes, cucumber, olives, red onion, and feta cheese.",
      imageUrl: "/images/recipes/greek-salad.jpg",
      prepTime: 15,
      cookTime: 0,
      servings: 4,
      calories: 200,
      cuisine: "Greek",
      dietaryTags: "vegetarian,gluten-free",
      ingredients: [
        { name: "Tomatoes", amount: "4", unit: "medium" },
        { name: "Cucumber", amount: "1", unit: "large" },
        { name: "Red onion", amount: "0.5", unit: "medium" },
        { name: "Kalamata olives", amount: "0.5", unit: "cup" },
        { name: "Feta cheese", amount: "4", unit: "oz" },
        { name: "Olive oil", amount: "3", unit: "tbsp" },
        { name: "Red wine vinegar", amount: "1", unit: "tbsp" },
      ],
    },
    {
      title: "Pulled Pork",
      description:
        "Slow-smoked pulled pork with tangy BBQ sauce. Great for sandwiches and gatherings.",
      imageUrl: "/images/recipes/pulled-pork.jpg",
      prepTime: 20,
      cookTime: 480,
      servings: 10,
      calories: 420,
      cuisine: "American",
      dietaryTags: "gluten-free,high-protein",
      ingredients: [
        { name: "Pork shoulder", amount: "5", unit: "lbs" },
        { name: "BBQ sauce", amount: "1", unit: "cup" },
        { name: "Brown sugar", amount: "0.25", unit: "cup" },
        { name: "Paprika", amount: "2", unit: "tbsp" },
        { name: "Garlic powder", amount: "1", unit: "tbsp" },
        { name: "Onion powder", amount: "1", unit: "tbsp" },
        { name: "Apple cider vinegar", amount: "0.25", unit: "cup" },
      ],
    },
    {
      title: "Avocado Toast",
      description:
        "Trendy smashed avocado on sourdough with everything bagel seasoning and a poached egg.",
      imageUrl: "/images/recipes/avocado-toast.jpg",
      prepTime: 10,
      cookTime: 5,
      servings: 2,
      calories: 320,
      cuisine: "American",
      dietaryTags: "vegetarian",
      ingredients: [
        { name: "Sourdough bread", amount: "2", unit: "slices" },
        { name: "Avocado", amount: "1", unit: "large" },
        { name: "Eggs", amount: "2", unit: "large" },
        { name: "Everything bagel seasoning", amount: "1", unit: "tsp" },
        { name: "Red pepper flakes", amount: "0.25", unit: "tsp" },
        { name: "Lemon juice", amount: "1", unit: "tsp" },
      ],
    },
    {
      title: "Tom Yum Soup",
      description:
        "Spicy and sour Thai soup with shrimp, mushrooms, lemongrass, and galangal.",
      imageUrl: "/images/recipes/tom-yum-soup.jpg",
      prepTime: 15,
      cookTime: 20,
      servings: 4,
      calories: 180,
      cuisine: "Thai",
      dietaryTags: "gluten-free",
      ingredients: [
        { name: "Shrimp", amount: "1", unit: "lb" },
        { name: "Mushrooms", amount: "8", unit: "oz" },
        { name: "Lemongrass", amount: "3", unit: "stalks" },
        { name: "Galangal", amount: "5", unit: "slices" },
        { name: "Lime juice", amount: "3", unit: "tbsp" },
        { name: "Fish sauce", amount: "2", unit: "tbsp" },
        { name: "Thai chili paste", amount: "2", unit: "tbsp" },
        { name: "Coconut milk", amount: "1", unit: "cup" },
      ],
    },
    {
      title: "Berry Parfait",
      description:
        "Layered Greek yogurt parfait with mixed berries, granola, and a drizzle of honey.",
      imageUrl: "/images/recipes/berry-parfait.jpg",
      prepTime: 10,
      cookTime: 0,
      servings: 2,
      calories: 260,
      cuisine: "American",
      dietaryTags: "vegetarian,gluten-free",
      ingredients: [
        { name: "Greek yogurt", amount: "2", unit: "cups" },
        { name: "Mixed berries", amount: "1.5", unit: "cups" },
        { name: "Granola", amount: "0.5", unit: "cup" },
        { name: "Honey", amount: "2", unit: "tbsp" },
        { name: "Chia seeds", amount: "1", unit: "tbsp" },
      ],
    },
    {
      title: "Lamb Curry",
      description:
        "Fragrant and rich lamb curry with warm spices, tomatoes, and fresh cilantro.",
      imageUrl: "/images/recipes/lamb-curry.jpg",
      prepTime: 20,
      cookTime: 90,
      servings: 6,
      calories: 490,
      cuisine: "Indian",
      dietaryTags: "gluten-free,high-protein",
      ingredients: [
        { name: "Lamb shoulder", amount: "2", unit: "lbs" },
        { name: "Onions", amount: "2", unit: "large" },
        { name: "Tomatoes", amount: "3", unit: "medium" },
        { name: "Coconut milk", amount: "1", unit: "can" },
        { name: "Curry powder", amount: "3", unit: "tbsp" },
        { name: "Cumin", amount: "1", unit: "tsp" },
        { name: "Coriander", amount: "1", unit: "tsp" },
        { name: "Garlic", amount: "4", unit: "cloves" },
        { name: "Ginger", amount: "1", unit: "inch" },
      ],
    },
    {
      title: "Caprese Sandwich",
      description:
        "Fresh mozzarella, ripe tomatoes, and basil on ciabatta with a balsamic glaze.",
      imageUrl: "/images/recipes/caprese-sandwich.jpg",
      prepTime: 10,
      cookTime: 0,
      servings: 2,
      calories: 380,
      cuisine: "Italian",
      dietaryTags: "vegetarian",
      ingredients: [
        { name: "Ciabatta rolls", amount: "2", unit: "large" },
        { name: "Fresh mozzarella", amount: "8", unit: "oz" },
        { name: "Tomatoes", amount: "2", unit: "large" },
        { name: "Fresh basil", amount: "8", unit: "leaves" },
        { name: "Balsamic glaze", amount: "2", unit: "tbsp" },
        { name: "Olive oil", amount: "1", unit: "tbsp" },
      ],
    },
    {
      title: "Miso Ramen",
      description:
        "Rich miso broth with wheat noodles, soft-boiled egg, chashu pork, and nori.",
      imageUrl: "/images/recipes/miso-ramen.jpg",
      prepTime: 20,
      cookTime: 45,
      servings: 4,
      calories: 520,
      cuisine: "Japanese",
      dietaryTags: "",
      ingredients: [
        { name: "Ramen noodles", amount: "14", unit: "oz" },
        { name: "White miso paste", amount: "4", unit: "tbsp" },
        { name: "Chicken broth", amount: "6", unit: "cups" },
        { name: "Pork belly", amount: "8", unit: "oz" },
        { name: "Eggs", amount: "4", unit: "large" },
        { name: "Green onions", amount: "4", unit: "stalks" },
        { name: "Nori", amount: "4", unit: "sheets" },
        { name: "Soy sauce", amount: "2", unit: "tbsp" },
        { name: "Sesame oil", amount: "1", unit: "tbsp" },
      ],
    },
  ];

  const createdRecipes = [];
  for (const r of recipesData) {
    const { ingredients, ...recipeFields } = r;
    const recipe = await prisma.recipe.create({
      data: {
        ...recipeFields,
        userId: alice.id,
        ingredients: {
          create: ingredients,
        },
      },
    });
    createdRecipes.push(recipe);
  }

  const mealPlan1 = await prisma.mealPlan.create({
    data: {
      name: "Healthy Week",
      startDate: new Date("2026-04-06"),
      endDate: new Date("2026-04-12"),
      userId: alice.id,
      recipes: {
        create: [
          {
            day: "monday",
            mealType: "breakfast",
            recipeId: createdRecipes[0].id,
          },
          {
            day: "monday",
            mealType: "lunch",
            recipeId: createdRecipes[2].id,
          },
          {
            day: "monday",
            mealType: "dinner",
            recipeId: createdRecipes[1].id,
          },
          {
            day: "tuesday",
            mealType: "breakfast",
            recipeId: createdRecipes[8].id,
          },
          {
            day: "tuesday",
            mealType: "lunch",
            recipeId: createdRecipes[12].id,
          },
          {
            day: "tuesday",
            mealType: "dinner",
            recipeId: createdRecipes[4].id,
          },
          {
            day: "wednesday",
            mealType: "breakfast",
            recipeId: createdRecipes[16].id,
          },
          {
            day: "wednesday",
            mealType: "lunch",
            recipeId: createdRecipes[10].id,
          },
          {
            day: "wednesday",
            mealType: "dinner",
            recipeId: createdRecipes[6].id,
          },
        ],
      },
    },
  });

  const mealPlan2 = await prisma.mealPlan.create({
    data: {
      name: "Quick Meals",
      startDate: new Date("2026-04-13"),
      endDate: new Date("2026-04-19"),
      userId: bob.id,
      recipes: {
        create: [
          {
            day: "monday",
            mealType: "breakfast",
            recipeId: createdRecipes[14].id,
          },
          {
            day: "monday",
            mealType: "dinner",
            recipeId: createdRecipes[5].id,
          },
          {
            day: "thursday",
            mealType: "lunch",
            recipeId: createdRecipes[18].id,
          },
          {
            day: "friday",
            mealType: "dinner",
            recipeId: createdRecipes[19].id,
          },
        ],
      },
    },
  });

  await prisma.chatMessage.createMany({
    data: [
      {
        role: "user",
        content: "What can I make with chicken and rice?",
        userId: alice.id,
      },
      {
        role: "assistant",
        content:
          "You could try a classic chicken and rice casserole, chicken fried rice, or a simple chicken rice bowl with teriyaki sauce. Would you like a full recipe for any of these?",
        userId: alice.id,
      },
      {
        role: "user",
        content: "Give me a teriyaki chicken rice bowl recipe",
        userId: alice.id,
      },
      {
        role: "assistant",
        content:
          'Here\'s a quick teriyaki chicken rice bowl:\n\nIngredients:\n- 2 chicken thighs\n- 1 cup rice\n- 3 tbsp soy sauce\n- 2 tbsp mirin\n- 1 tbsp honey\n- 1 tsp ginger\n- Sesame seeds and green onion for garnish\n\nInstructions:\n1. Cook rice per package directions\n2. Mix soy sauce, mirin, honey, and ginger for teriyaki sauce\n3. Grill or pan-fry chicken thighs 6 min per side\n4. Slice chicken and arrange over rice\n5. Drizzle with teriyaki sauce and garnish',
        userId: alice.id,
      },
      {
        role: "user",
        content: "I need a quick dinner idea",
        userId: bob.id,
      },
      {
        role: "assistant",
        content:
          "How about a 15-minute pasta aglio e olio? Just garlic, olive oil, red pepper flakes, and spaghetti. Simple and delicious!",
        userId: bob.id,
      },
      {
        role: "user",
        content: "Something with no gluten please",
        userId: bob.id,
      },
      {
        role: "assistant",
        content:
          "Try a quick shrimp stir-fry with rice noodles! Use tamari instead of soy sauce to keep it gluten-free. Add whatever veggies you have on hand.",
        userId: bob.id,
      },
    ],
  });

  console.log("Seed data created successfully!");
  console.log(
    `Created ${3} users, ${createdRecipes.length} recipes, 2 meal plans, 8 chat messages`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
