import Image from 'next/image';
import type { ComponentProps } from 'react';

type Props = Omit<ComponentProps<'img'>, 'src' | 'width' | 'height' | 'loading'> & {
  src: string;
  width?: number | null;
  height?: number | null;
  /** 화면에서 차지하는 너비. 휴대폰에 원본(최대 1600px)을 그대로 보내지 않도록 srcset을 고르는 기준이 된다 */
  sizes: string;
  /** 첫 화면(LCP) 이미지: 바로, 높은 우선순위로 받는다 */
  eager?: boolean;
};

/**
 * 커버 이미지. 우리 미디어 서버(MEDIA_BASE_URL)의 이미지는 next/image로 화면 크기에 맞춰 줄이고 WebP로 바꿔 보낸다.
 * 다른 주소이거나 크기를 모르면(next/image는 width·height가 필요하다) 원본을 그대로 쓴다
 */
export function CoverImage({ src, width, height, sizes, eager = false, alt = '', ...rest }: Props) {
  const base = process.env.MEDIA_BASE_URL?.replace(/\/+$/, '');
  const loading = eager ? 'eager' : 'lazy';
  if (base && src.startsWith(`${base}/`) && width && height) {
    return (
      <Image
        {...rest}
        src={src}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        loading={loading}
        fetchPriority={eager ? 'high' : undefined}
      />
    );
  }
  return (
    <img
      {...rest}
      src={src}
      alt={alt}
      width={width ?? undefined}
      height={height ?? undefined}
      loading={loading}
      fetchPriority={eager ? 'high' : undefined}
    />
  );
}
