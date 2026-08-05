declare const __brand: unique symbol;

/**
 * Marks a type with a compile time brand for TypeScript's equivalent to nominal typing.
 * @see e.g. https://prosopo.io/blog/typescript-branding/ for a simple intro
 */
export type Branded<Type, Brand> = Type & {
    readonly [__brand]: Brand;
}
