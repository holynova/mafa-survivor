import fs from "node:fs";
const tag = process.env.STAGE_TAG;
const demo = process.env.DEMO_URL;
if (!tag || !demo) throw new Error("STAGE_TAG and DEMO_URL are required");
const lines = fs.readFileSync("CHANGELOG.md", "utf8").split("\n");
const start = lines.findIndex((line) => line.startsWith(`## ${tag} `));
if (start < 0) throw new Error("This tag has no stage entry in CHANGELOG.md");
const next = lines.findIndex(
  (line, index) => index > start && line.startsWith("## "),
);
const section = lines
  .slice(start, next < 0 ? undefined : next)
  .join("\n")
  .trim();
console.log(
  `在线测试：[打开游戏](${demo})\n\n${section}\n\n页面会显示版本与提交号；请通过页面的“反馈问题”入口提交测试结果。`,
);
