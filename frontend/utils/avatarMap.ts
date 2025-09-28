// avatarMap.ts
export const avatarMap: Record<string, any> = {
  "grandpa.png": require("../img/childhome/grandpa.png"),
  "grandma.png": require("../img/childhome/grandma.png"),
  "father.png": require("../img/childhome/man.png"),
  "mother.png": require("../img/childhome/woman.png"),
  "boy.png": require("../img/childhome/boy.png"),
  "girl.png": require("../img/childhome/girl.png"),
};

/** 回傳對應的頭貼圖片來源 */
export function getAvatarSource(avatar?: string) {
  if (!avatar) return avatarMap["woman.png"];
  return avatarMap[avatar] || avatarMap["woman.png"];
}

/** 可用頭貼清單（排除 default.png） */
export const avatarKeys = Object.keys(avatarMap).filter(
  (k) => k !== "default.png"
);
