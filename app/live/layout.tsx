import type { Metadata } from "next";
export const metadata: Metadata = { title: "LifeLens Live — 지금, 눈앞의 일상", description: "카메라와 위치로 식사와 귀갓길의 날씨를 이해하고, 필요한 순간에 먼저 알려주는 LifeLens 아이폰 체험." };
export default function LiveLayout({ children }: { children: React.ReactNode }) { return children; }
