"use client";

import { useEffect } from "react";
import packageJson from "../../package.json";

export function VersionLog() {
  useEffect(() => {
    console.log(`%c著色圖魔法屋 v${packageJson.version}`, "color: #f4a261; font-size: 14px; font-weight: bold;");
  }, []);
  return null;
}
