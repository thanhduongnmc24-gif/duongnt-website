export type CauHoi = {
  id: string;
  loai: "nhap-so" | "chon" | "so-sanh" | "sap-xep";
  deBai: string;
  goiY?: string;
  dapAn: string;
  luaChon?: string[];
};

export type BaiHoc = {
  id: string;
  ten: string;
  moTa: string;
  cauHoi: CauHoi[];
};

export type TuanHoc = {
  so: number;
  ten: string;
  moTa: string;
  moKhoa: boolean;
  baiHoc: BaiHoc[];
};

const tuan1: BaiHoc[] = [
  {
    id: "tiet-1",
    ten: "Tiết 1",
    moTa: "Đếm số, thứ tự và tư duy xếp hàng",
    cauHoi: [
      { id: "t1-1", loai: "nhap-so", deBai: "Có bao nhiêu chấm tròn? ● ● ●", dapAn: "3" },
      { id: "t1-2", loai: "chon", deBai: "Số nào đứng sau số 4?", luaChon: ["3", "5", "6"], dapAn: "5" },
      { id: "t1-3", loai: "sap-xep", deBai: "Sắp xếp các số từ bé đến lớn: 5, 2, 4, 1, 3", goiY: "Nhập các số, cách nhau bằng dấu phẩy.", dapAn: "1,2,3,4,5" },
      { id: "t1-4", loai: "nhap-so", deBai: "An đứng thứ 4 từ đầu và thứ 5 từ cuối. Hàng có bao nhiêu bạn?", goiY: "Đừng đếm An hai lần.", dapAn: "8" },
      { id: "t1-5", loai: "chon", deBai: "Hình nào khác loại?", luaChon: ["Hình tròn", "Hình vuông", "Quả táo"], dapAn: "Quả táo" },
    ],
  },
  {
    id: "tiet-2",
    ten: "Tiết 2",
    moTa: "Số liền trước, liền sau và điền số",
    cauHoi: [
      { id: "t2-1", loai: "nhap-so", deBai: "Số liền sau của 2 là số mấy?", dapAn: "3" },
      { id: "t2-2", loai: "nhap-so", deBai: "Số liền trước của 4 là số mấy?", dapAn: "3" },
      { id: "t2-3", loai: "chon", deBai: "Số nào nằm giữa 3 và 5?", luaChon: ["2", "4", "6"], dapAn: "4" },
      { id: "t2-4", loai: "chon", deBai: "Dãy số nào đúng?", luaChon: ["1, 2, 3, 4, 5", "1, 3, 2, 5, 4", "5, 3, 4, 2, 1"], dapAn: "1, 2, 3, 4, 5" },
      { id: "t2-5", loai: "nhap-so", deBai: "Trước cô Nga có 5 người. Cô đứng thứ 5 từ cuối. Hàng có bao nhiêu người?", dapAn: "10" },
    ],
  },
  {
    id: "tiet-3",
    ten: "Tiết 3",
    moTa: "Đếm hình và nhận biết số từ 0 đến 7",
    cauHoi: [
      { id: "t3-1", loai: "nhap-so", deBai: "Có bao nhiêu ngôi sao? ★ ★ ★ ★ ★ ★", dapAn: "6" },
      { id: "t3-2", loai: "nhap-so", deBai: "Số liền sau của 6 là số mấy?", dapAn: "7" },
      { id: "t3-3", loai: "nhap-so", deBai: "Số liền trước của 7 là số mấy?", dapAn: "6" },
      { id: "t3-4", loai: "chon", deBai: "Nhóm nào có 5 hình?", luaChon: ["● ● ● ●", "▲ ▲ ▲ ▲ ▲", "■ ■ ■ ■ ■ ■"], dapAn: "▲ ▲ ▲ ▲ ▲" },
      { id: "t3-5", loai: "sap-xep", deBai: "Sắp xếp từ lớn đến bé: 2, 6, 4, 1", goiY: "Nhập các số, cách nhau bằng dấu phẩy.", dapAn: "6,4,2,1" },
    ],
  },
  {
    id: "tu-luyen",
    ten: "Tự luyện",
    moTa: "Ôn tập tổng hợp cuối tuần",
    cauHoi: [
      { id: "tl-1", loai: "nhap-so", deBai: "Số liền trước của 1 là số mấy?", dapAn: "0" },
      { id: "tl-2", loai: "nhap-so", deBai: "Số liền sau của 9 là số mấy?", dapAn: "10" },
      { id: "tl-3", loai: "chon", deBai: "Số lớn nhất là số nào?", luaChon: ["6", "8", "7"], dapAn: "8" },
      { id: "tl-4", loai: "so-sanh", deBai: "Điền dấu thích hợp: 7 ... 5", luaChon: ["<", "=", ">"], dapAn: ">" },
      { id: "tl-5", loai: "sap-xep", deBai: "Sắp xếp từ bé đến lớn: 7, 3, 6, 4, 5", dapAn: "3,4,5,6,7" },
    ],
  },
  {
    id: "tham-khao",
    ten: "Tham khảo",
    moTa: "Bài tư duy nâng cao vừa sức",
    cauHoi: [
      { id: "tk-1", loai: "nhap-so", deBai: "Điền số tiếp theo: 0, 2, 4, 6, ...", dapAn: "8" },
      { id: "tk-2", loai: "nhap-so", deBai: "Điền số tiếp theo: 0, 1, 3, 6, ...", goiY: "Mỗi lần cộng thêm 1 số lớn hơn lần trước.", dapAn: "10" },
      { id: "tk-3", loai: "chon", deBai: "Một hình vuông có bao nhiêu cạnh?", luaChon: ["3", "4", "5"], dapAn: "4" },
      { id: "tk-4", loai: "nhap-so", deBai: "Có 3 con vịt ở hồ, thêm 2 con đến. Có tất cả bao nhiêu con?", dapAn: "5" },
      { id: "tk-5", loai: "chon", deBai: "Số nào còn thiếu: 1, 2, ..., 4, 5?", luaChon: ["0", "3", "6"], dapAn: "3" },
    ],
  },
];

const chuDe = [
  "Làm quen số 0 đến 10", "Dãy số và số liền trước, liền sau", "So sánh số lượng", "Dấu lớn hơn, bé hơn, bằng nhau",
  "Phép cộng ban đầu", "Cộng trong phạm vi 9", "Cộng trong phạm vi 10", "Phép trừ trong phạm vi 5", "Cộng trừ trong phạm vi 6",
];

export const cacTuanHoc: TuanHoc[] = chuDe.map((moTa, index) => ({
  so: index + 1,
  ten: `Tuần ${index + 1}`,
  moTa,
  moKhoa: index === 0,
  baiHoc: index === 0 ? tuan1 : [],
}));
