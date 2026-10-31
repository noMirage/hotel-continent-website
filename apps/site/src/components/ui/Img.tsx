import Image, { type ImageProps, type StaticImageData } from "next/image";

type ImgProps = Omit<ImageProps, "src" | "width" | "height" | "alt"> & {
  src: string | StaticImageData;
  alt: string;
  width?: number;
  height?: number;
};

/**
 * Drop-in for the `<img>` tags in the ported components: serves resized AVIF/WebP via
 * next/image. Layout still comes from className (e.g. `w-full h-full object-cover`);
 * width/height only set the intrinsic size used for the srcset.
 * For the LCP image pass `fetchPriority="high"` (it is then loaded eagerly).
 */
export function Img({ src, width, height, sizes = "(max-width: 768px) 100vw, 50vw", fetchPriority, loading, ...rest }: ImgProps) {
  const isStatic = typeof src !== "string";
  return (
    <Image
      src={src}
      width={isStatic ? undefined : (width ?? 1600)}
      height={isStatic ? undefined : (height ?? 1067)}
      sizes={sizes}
      fetchPriority={fetchPriority}
      loading={loading ?? (fetchPriority === "high" ? "eager" : undefined)}
      {...rest}
    />
  );
}
