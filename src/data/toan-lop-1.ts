export type BaiHoc = {
  id: string;
  ten: string;
  moTa: string;
  quyen: 1 | 2;
  tuan: number;
  tuanTrongQuyen: number;
  trang: number;
  banVeSvg: string;
};

export type TuanHoc = {
  so: number;
  ten: string;
  moTa: string;
  quyen: 1 | 2;
  tuanTrongQuyen: number;
  baiHoc: BaiHoc[];
};

const TEN_BAI = ["Tiết 1", "Tiết 2", "Tiết 3", "Phiếu tự luyện", "Bài tập tham khảo"] as const;
const MO_TA_BAI = [
  "Bài học chính thứ nhất trong tuần",
  "Bài học chính thứ hai trong tuần",
  "Bài học chính thứ ba trong tuần",
  "Ôn luyện toàn bộ kiến thức trong tuần",
  "Bài tư duy mở rộng theo đúng sách",
] as const;

function taoTuan(index: number): TuanHoc {
  const quyen = (index < 9 ? 1 : 2) as 1 | 2;
  const tuanTrongQuyen = index % 9 + 1;
  const so = index + 1;
  const trangDau = 3 + (tuanTrongQuyen - 1) * 5;
  const baiHoc = TEN_BAI.map((ten, baiIndex): BaiHoc => {
    const trang = trangDau + baiIndex;
    return {
      id: `q${quyen}-tuan-${tuanTrongQuyen}-bai-${baiIndex + 1}`,
      ten,
      moTa: MO_TA_BAI[baiIndex],
      quyen,
      tuan: so,
      tuanTrongQuyen,
      trang,
      banVeSvg: `/toanlop1-workbook/q${quyen}-page-${String(trang).padStart(2, "0")}.svg?v=4`,
    };
  });
  return {
    so,
    ten: `Tuần ${so}`,
    moTa: `Quyển ${quyen} · Tuần ${tuanTrongQuyen} trong sách`,
    quyen,
    tuanTrongQuyen,
    baiHoc,
  };
}

export const cacTuanHoc: TuanHoc[] = Array.from({ length: 18 }, (_, index) => taoTuan(index));
export const tatCaBaiHoc = cacTuanHoc.flatMap((tuan) => tuan.baiHoc);
