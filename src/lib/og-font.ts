/** OG 이미지용 한글 폰트: 필요한 글자만 Google Fonts에서 TTF로 받아온다 */
export async function loadOgFont(text: string, weight = 700): Promise<ArrayBuffer | null> {
  try {
    const css = await (
      await fetch(`https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@${weight}&text=${encodeURIComponent(text)}`)
    ).text();
    const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    if (!url) return null;
    const res = await fetch(url);
    return res.ok ? res.arrayBuffer() : null;
  } catch {
    return null;
  }
}
