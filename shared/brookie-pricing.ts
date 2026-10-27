export const brookieCharacterAddonPrices: Record<string, number> = {
  birthday_bear: 700,
  miss_bear: 700,
  horse: 500,
};

// Old orders retain their original fees; new orders store each fee explicitly.
export function storedBrookieAddonPrices(options: Record<string, any>) {
  const fee = (value: unknown, fallback: number) => Number.isSafeInteger(value) && Number(value) >= 0 ? Number(value) : fallback;
  const character = fee(options.characterAddonPrice, options.premiumCharacter ? 500 : 0);
  const heart = fee(options.heartAddonPrice, options.heartMessage ? 500 : 0);
  const paper = fee(options.customPaperAddonPrice, options.customPaper || options.paper === 'custom' ? 700 : 0);
  return { character, heart, paper };
}

export function storedBrookieAddonDetails(options: Record<string, any>): string[] {
  const { character, heart, paper } = storedBrookieAddonPrices(options);
  return [
    character ? `${options.characterName || options.character || '선택'} 캐릭터 추가 +${character.toLocaleString('ko-KR')}원` : '',
    heart ? `하트 문구 추가 +${heart.toLocaleString('ko-KR')}원` : '',
    paper ? `커스텀 종이 추가 +${paper.toLocaleString('ko-KR')}원` : '',
  ].filter(Boolean);
}
