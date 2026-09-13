import { ArrowRight } from "lucide-react";

type Product = {
  id: string;
  name: string;
  badge: string;
  description: string;
  image: string;
  imageAlt: string;
  priceLabel: string;
  minimumLabel: string;
  href: string;
  cta: string;
  accent: {
    soft: string;
    text: string;
    border: string;
  };
};

const products: Product[] = [
  {
    id: "brookie",
    name: "브루키",
    badge: "커스텀 추천",
    description: "캐릭터와 포장을 직접 꾸미는 특별한 브루키",
    image: "/public/images/characters/bear.webp",
    imageAlt: "낫띵메터스 곰돌이 커스텀 브루키",
    priceLabel: "개당 7,800원부터",
    minimumLabel: "최소 12개부터",
    href: "/brookie",
    cta: "브루키 주문하기",
    accent: {
      soft: "#fff0f2",
      text: "#c24163",
      border: "#fecdd3",
    },
  },
  {
    id: "cookies",
    name: "꾸덕쿠키",
    badge: "단체 답례 추천",
    description: "패키지와 맛을 골라 만드는 답례 쿠키",
    image: "/public/cookie-assets/gallery/one-box-01.webp",
    imageAlt: "낫띵메터스 수제 꾸덕쿠키 1구박스",
    priceLabel: "쿠키 1개 4,500원 + 포장",
    minimumLabel: "패키지와 맛 선택",
    href: "/cookies",
    cta: "쿠키 주문하기",
    accent: {
      soft: "#eff6ff",
      text: "#2563eb",
      border: "#bfdbfe",
    },
  },
  {
    id: "lucky",
    name: "럭키쿠키 세트",
    badge: "간단 주문",
    description: "수량만 선택하면 쉽게 주문할 수 있는 선물세트",
    image: "/public/lucky-assets/gallery/gallery-05.webp",
    imageAlt: "낫띵메터스 럭키쿠키 4가지 감정 선물세트",
    priceLabel: "1세트 15,000원",
    minimumLabel: "수량만 선택",
    href: "/lucky",
    cta: "럭키 주문하기",
    accent: {
      soft: "#ecfdf5",
      text: "#15803d",
      border: "#bbf7d0",
    },
  },
];

export default function ProductOrderHome() {
  return (
    <main className="min-h-screen bg-[#fffdf9] px-4 py-7 text-[#1f1b16] sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-9 max-w-xl sm:mb-12">
          <p className="mb-3 text-sm font-black tracking-[0.16em] text-[#c24163]">
            NOTHINGMATTERS.
          </p>
          <h1 className="text-4xl font-black leading-[1.05] tracking-[-0.05em] sm:text-5xl">
            무엇을 주문할까요?
          </h1>
          <p className="mt-4 text-base font-semibold leading-7 text-[#756a5d] sm:text-lg">
            원하는 상품을 선택하면 바로 주문을 시작할 수 있어요.
          </p>
        </header>

        <section aria-label="주문할 상품 선택" className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {products.map((product) => (
            <article
              key={product.id}
              className="group flex min-w-0 flex-col overflow-hidden rounded-[24px] border bg-white shadow-[0_12px_30px_rgba(92,62,30,0.08)] transition-[border-color,box-shadow,transform] duration-200 ease-out motion-reduce:transition-none lg:hover:-translate-y-1 lg:hover:shadow-[0_18px_38px_rgba(92,62,30,0.12)]"
              style={{ borderColor: product.accent.border }}
            >
              <div className="relative aspect-[16/10] overflow-hidden" style={{ backgroundColor: product.accent.soft }}>
                <img
                  src={product.image}
                  alt={product.imageAlt}
                  className="h-full w-full object-cover transition-transform duration-300 ease-out motion-reduce:transition-none lg:group-hover:scale-[1.02]"
                  loading={product.id === "brookie" ? "eager" : "lazy"}
                />
              </div>

              <div className="flex flex-1 flex-col p-5 sm:p-6">
                <span
                  className="w-fit rounded-full px-3 py-1 text-xs font-black"
                  style={{ backgroundColor: product.accent.soft, color: product.accent.text }}
                >
                  {product.badge}
                </span>
                <h2 className="mt-4 text-2xl font-black tracking-[-0.04em]">{product.name}</h2>
                <p className="mt-2 min-h-12 text-sm font-semibold leading-6 text-[#756a5d]">
                  {product.description}
                </p>
                <p className="mt-5 text-sm font-black text-[#1f1b16]">
                  {product.priceLabel}
                  <span className="mx-2 text-[#c7b9a8]" aria-hidden="true">·</span>
                  <span className="text-[#756a5d]">{product.minimumLabel}</span>
                </p>
                <a
                  href={product.href}
                  className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#1f1b16] px-4 text-sm font-black text-white transition-colors duration-200 ease-out hover:bg-[#3b3229] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-[#c24163] motion-reduce:transition-none"
                >
                  {product.cta}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
              </div>
            </article>
          ))}
        </section>

        <p className="mt-8 text-center text-sm font-semibold text-[#8c7f70]">
          새로운 상품도 준비 중이에요.
        </p>
      </div>
    </main>
  );
}
