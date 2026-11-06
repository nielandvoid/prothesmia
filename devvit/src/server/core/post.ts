import { reddit } from "@devvit/web/server";
import { loadConfig } from "./config.ts";

const HEIGHTS: Record<string, number> = { tall: 232, compact: 166, desktop: 512 };
const BACKGROUND = "#1b1b1bff";

export const createCountdownPost = async () => {
  const { postTitle, dimensions } = await loadConfig();
  const post = await reddit.submitCustomPost({
    title: postTitle,
    entry: "default",
    styles: {
      heightPixels: HEIGHTS[dimensions],
      backgroundColor: BACKGROUND,
      backgroundColorDark: BACKGROUND,
    },
  });
  await post.sticky(1).catch((error: unknown) => console.error(`could not sticky ${post.id}: ${error}`));
  return post;
};
