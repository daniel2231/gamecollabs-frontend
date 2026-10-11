import { describe, expect, it } from 'vitest';
import { coverFit, fitWithin } from './cover';

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
