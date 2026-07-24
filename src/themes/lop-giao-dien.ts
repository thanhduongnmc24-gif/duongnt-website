export function lopTrangDeMuc(ma: string) {
  if (ma === "dark-tech") {
    return {
      main: "min-h-screen bg-[#090812] px-4 py-10 text-white",
      header: "rounded-3xl border border-fuchsia-400/20 bg-white/5 p-7 shadow-[0_0_50px_rgba(139,92,246,.18)]",
      phu: "text-fuchsia-400",
      tieuDe: "text-white",
      moTa: "text-slate-400",
      rong: "mx-auto max-w-7xl",
      luoi: "grid gap-5 md:grid-cols-2 lg:grid-cols-3",
    };
  }

  if (ma === "minimal-light") {
    return {
      main: "min-h-screen bg-[#f3f4f6] px-4 py-8 text-slate-900",
      header: "rounded-xl border-l-4 border-red-600 bg-white p-6 shadow-sm",
      phu: "text-red-600",
      tieuDe: "text-slate-900",
      moTa: "text-slate-600",
      rong: "mx-auto max-w-7xl",
      luoi: "grid gap-4 sm:grid-cols-2 lg:grid-cols-4",
    };
  }

  return {
    main: "min-h-screen bg-[#fffdf6] px-4 py-10 text-[#17351f]",
    header: "rounded-[28px] bg-[#eaf3df] p-8",
    phu: "text-green-700",
    tieuDe: "text-[#17351f]",
    moTa: "text-green-900/70",
    rong: "mx-auto max-w-7xl",
    luoi: "grid gap-5 md:grid-cols-2 lg:grid-cols-3",
  };
}

export function lopTrangBaiViet(ma: string) {
  if (ma === "dark-tech") {
    return {
      main: "min-h-screen bg-[#090812] px-4 py-10 text-white",
      article: "mx-auto max-w-5xl overflow-hidden rounded-[30px] border border-purple-400/20 bg-[#12101d] shadow-[0_0_70px_rgba(139,92,246,.18)]",
      phu: "text-fuchsia-400",
      tieuDe: "text-white",
      tomTat: "text-slate-300",
      thongTin: "border-purple-400/20 text-slate-400",
      noiDung: "text-slate-200",
    };
  }

  if (ma === "minimal-light") {
    return {
      main: "min-h-screen bg-[#f3f4f6] px-4 py-8 text-slate-900",
      article: "mx-auto max-w-5xl overflow-hidden rounded-xl bg-white shadow-sm",
      phu: "text-red-600",
      tieuDe: "text-slate-900",
      tomTat: "text-slate-600",
      thongTin: "border-slate-200 text-slate-500",
      noiDung: "text-slate-800",
    };
  }

  return {
    main: "min-h-screen bg-[#fffdf6] px-4 py-10 text-[#17351f]",
    article: "mx-auto max-w-4xl overflow-hidden rounded-[30px] bg-white shadow-xl",
    phu: "text-green-700",
    tieuDe: "text-[#17351f]",
    tomTat: "text-green-900/70",
    thongTin: "border-green-100 text-green-900/60",
    noiDung: "text-[#244a2c]",
  };
}
