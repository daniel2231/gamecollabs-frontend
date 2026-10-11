import { describe, expect, it } from 'vitest';
import { coverFit, fitWithin, imageUrlFromTransfer } from './cover';

describe('coverFit', () => {
  it('16:9에 가까우면 꽉 채우고, 크기를 모르면 꽉 채운다', () => {
    expect(coverFit({ width: 1600, height: 900 })).toBe('cover');
    expect(coverFit({ width: 1200, height: 800 })).toBe('cover'); // 3:2
    expect(coverFit({ width: null, height: null })).toBe('cover');
  });

  it('정사각형·세로형은 통째로 보여준다', () => {
    expect(coverFit({ width: 600, height: 600 })).toBe('contain');
    expect(coverFit({ width: 900, height: 1600 })).toBe('contain');
  });
});

describe('fitWithin', () => {
  it('긴 변을 1600으로 맞추고 비율을 지킨다', () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(1000, 3000)).toEqual({ width: 533, height: 1600 });
  });

  it('작은 이미지는 키우지 않는다', () => {
    expect(fitWithin(800, 450)).toEqual({ width: 800, height: 450 });
  });
});

describe('imageUrlFromTransfer', () => {
  it('링크로 감싼 이미지는 링크가 아니라 <img src>를 고른다', () => {
    expect(
      imageUrlFromTransfer({
        html: '<a href="https://news.example.com/article"><img alt="x" src="https://cdn.example.com/a.jpg?w=1&amp;h=2"></a>',
        uriList: 'https://news.example.com/article',
      }),
    ).toBe('https://cdn.example.com/a.jpg?w=1&h=2');
  });

  it('HTML이 없으면 uri-list(주석 줄 제외), 그다음 일반 텍스트', () => {
    expect(imageUrlFromTransfer({ uriList: '# comment\r\nhttps://cdn.example.com/b.png' })).toBe('https://cdn.example.com/b.png');
    expect(imageUrlFromTransfer({ text: '  https://cdn.example.com/c.webp ' })).toBe('https://cdn.example.com/c.webp');
  });

  it('data: 이미지는 받고, 상대 주소나 다른 스킴은 받지 않는다', () => {
    expect(imageUrlFromTransfer({ html: "<img src='data:image/png;base64,AAAA'>" })).toBe('data:image/png;base64,AAAA');
    expect(imageUrlFromTransfer({ html: '<img src="/a.jpg">' })).toBeNull();
    expect(imageUrlFromTransfer({ text: 'javascript:alert(1)' })).toBeNull();
    expect(imageUrlFromTransfer({ text: '그냥 글자' })).toBeNull();
  });
});
