"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, use } from "react";

interface Recipe {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  calories: number | null;
  cuisine: string | null;
  dietaryTags: string | null;
  ingredients: { id: string; name: string; amount: string; unit: string }[];
  user: { name: string };
}

export default function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/recipes/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.recipe) setRecipe(data.recipe);
        else setNotFound(true);
      })
      .catch(() => setNotFound(true));
  }, [id]);

  if (notFound) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="text-2xl uppercase text-brown">Recipe not found</h1>
        <p className="mt-2 text-sm text-brown/70">
          It may have been deleted from the catalog.
        </p>
        <Link href="/recipes" className="btn btn-secondary mt-6">
          Back to recipes
        </Link>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="h-72 w-full animate-pulse rounded-card bg-brown/15" />
        <div className="mt-6 h-8 w-2/3 animate-pulse rounded-lg bg-brown/15" />
        <div className="mt-3 h-4 w-full animate-pulse rounded bg-brown/15" />
      </div>
    );
  }

  const tags = (recipe.dietaryTags ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const stats = [
    { label: "Prep", value: `${recipe.prepTime} min` },
    { label: "Cook", value: `${recipe.cookTime} min` },
    { label: "Serves", value: `${recipe.servings}` },
    ...(recipe.calories ? [{ label: "Calories", value: `${recipe.calories}` }] : []),
  ];

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <Link
        href="/recipes"
        className="text-sm text-brown/70 transition-colors hover:text-brown"
      >
        ← All recipes
      </Link>

      <div className="relative mt-5 h-[340px] overflow-hidden rounded-card border-2 border-brown">
        <Image
          src={recipe.imageUrl}
          alt={recipe.title}
          fill
          sizes="(max-width: 896px) 100vw, 896px"
          className="object-cover"
          priority
        />
      </div>

      <div className="mt-8 flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          {recipe.cuisine && (
            <p className="text-xs font-medium uppercase tracking-wider text-red">
              {recipe.cuisine}
            </p>
          )}
          <h1 className="mt-1.5 text-4xl uppercase leading-tight text-brown">
            {recipe.title}
          </h1>
          <p className="mt-3 text-base leading-relaxed text-brown/70">
            {recipe.description}
          </p>
          {tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span key={tag} className="tag">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-card border-2 border-brown bg-brown/20 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-beige px-5 py-4">
            <dt className="text-xs uppercase tracking-wide text-brown/55">
              {stat.label}
            </dt>
            <dd className="mt-1 font-display text-xl font-semibold text-brown">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>

      <section className="mt-10">
        <h2 className="text-xl uppercase text-brown">Ingredients</h2>
        <ul className="card mt-4 divide-y divide-brown">
          {recipe.ingredients.map((ing) => (
            <li
              key={ing.id}
              className="flex items-baseline justify-between gap-4 px-5 py-3"
            >
              <span className="text-sm text-brown">{ing.name}</span>
              <span className="shrink-0 text-sm text-brown/70">
                {[ing.amount, ing.unit].filter(Boolean).join(" ")}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-8 text-xs text-brown/55">Added by {recipe.user.name}</p>
    </div>
  );
}
