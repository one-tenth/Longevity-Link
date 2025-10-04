// avatarMap.ts
export const avatarMap: Record<string, any> = {
  "grandpa.png": require("../img/childhome/grandpa.png"),
  "grandma.png": require("../img/childhome/grandma.png"),
  "father.png": require("../img/childhome/man.png"),
  "mother.png": require("../img/childhome/woman.png"),
  "boy.png": require("../img/childhome/boy.png"),
  "girl.png": require("../img/childhome/girl.png"),
};

/** 回傳對應的頭貼圖片來源（支援網址與本地檔名） */
export function getAvatarSource(avatar?: string) {
  if (!avatar) return avatarMap["grandpa.png"];
  if (avatar.startsWith("http")) return { uri: avatar };
  return avatarMap[avatar] || avatarMap["grandpa.png"];
}

/** 可用頭貼清單（排除 default.png） */
export const avatarKeys = Object.keys(avatarMap).filter(
  (k) => k !== "default.png"
);