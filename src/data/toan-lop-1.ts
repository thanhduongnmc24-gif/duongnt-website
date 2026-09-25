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


const taoBai = (id: string, ten: string, moTa: string, cauHoi: CauHoi[]): BaiHoc => ({ id, ten, moTa, cauHoi });
const q = (id: string, loai: CauHoi["loai"], deBai: string, dapAn: string, luaChon?: string[], goiY?: string): CauHoi => ({ id, loai, deBai, dapAn, ...(luaChon ? { luaChon } : {}), ...(goiY ? { goiY } : {}) });

const tuan2: BaiHoc[] = [
  taoBai("tuan2-tiet-1", "Tiết 1", "Đếm và tìm số bí ẩn", [
    q("w2-1-1","nhap-so","Điền số còn thiếu: 4, 5, 6, ..., 8","7"),
    q("w2-1-2","chon","Số nào lớn nhất?","9",["7","9","8"]),
    q("w2-1-3","nhap-so","Có 8 miếng bánh, lấy đi 3 miếng. Còn lại bao nhiêu miếng?","5"),
    q("w2-1-4","sap-xep","Sắp xếp từ bé đến lớn: 9, 6, 8, 7","6,7,8,9"),
    q("w2-1-5","nhap-so","Bên trái Nam có 5 bạn, bên phải có 3 bạn. Cả hàng có bao nhiêu bạn?","9",undefined,"Nhớ tính cả Nam.")]),
  taoBai("tuan2-tiet-2", "Tiết 2", "Tia số và hình học", [
    q("w2-2-1","nhap-so","Số nằm sau 8 trên tia số là số mấy?","9"),
    q("w2-2-2","chon","Hình chữ nhật có bao nhiêu cạnh?","4",["3","4","5"]),
    q("w2-2-3","nhap-so","Điền số: 0, 1, 2, 3, ..., 5","4"),
    q("w2-2-4","chon","Số nào nằm giữa 7 và 9?","8",["6","8","10"]),
    q("w2-2-5","nhap-so","Chuột đi qua 4 ô rồi thêm 3 ô. Chuột đã đi qua bao nhiêu ô?","7")]),
  taoBai("tuan2-tiet-3", "Tiết 3", "Dãy số chẵn, lẻ", [
    q("w2-3-1","nhap-so","Điền số tiếp theo: 9, 7, 5, ...","3"),
    q("w2-3-2","nhap-so","Điền số tiếp theo: 10, 8, 6, ...","4"),
    q("w2-3-3","chon","Số lẻ lớn nhất có một chữ số là số nào?","9",["8","9","10"]),
    q("w2-3-4","chon","Số chẵn lớn nhất có một chữ số là số nào?","8",["7","8","9"]),
    q("w2-3-5","chon","Câu nào đúng?","Số liền sau của 9 là 10",["Số liền sau của 9 là 8","Số liền sau của 9 là 10","Số liền trước của 7 là 8"])]),
  taoBai("tuan2-tu-luyen", "Tự luyện", "Ôn số trong phạm vi 10", [
    q("w2-tl-1","nhap-so","Số liền sau của 3 là số mấy?","4"),q("w2-tl-2","nhap-so","Số liền trước của 10 là số mấy?","9"),q("w2-tl-3","nhap-so","Điền số tiếp theo: 1, 3, 5, ...","7"),q("w2-tl-4","nhap-so","Điền số tiếp theo: 0, 2, 4, 6, ...","8"),q("w2-tl-5","chon","Số lượng nào nhiều nhất?","9",["7","9","8"])]),
  taoBai("tuan2-tham-khao", "Tham khảo", "Thử thách quy luật", [
    q("w2-tk-1","nhap-so","Có bao nhiêu số lớn hơn 5 và bé hơn 9?","3"),q("w2-tk-2","sap-xep","Viết các số lớn hơn 5 và bé hơn 9 theo thứ tự tăng dần","6,7,8"),q("w2-tk-3","nhap-so","Dãy 0, 1, 3, 6, ... có số tiếp theo là gì?","10"),q("w2-tk-4","nhap-so","Chia 7 viên bi: một lọ có 3 viên. Lọ kia có bao nhiêu viên?","4"),q("w2-tk-5","chon","Số lớn nhất bé hơn 9 là số nào?","8",["7","8","10"])])
];

const tuan3: BaiHoc[] = [
  taoBai("tuan3-tiet-1","Tiết 1","Bằng nhau và cân nặng",[q("w3-1-1","nhap-so","Có 4 quả táo. Cần thêm bao nhiêu quả vào nhóm có 2 quả để hai nhóm bằng nhau?","2"),q("w3-1-2","chon","Nhóm nào bằng 5?","● ● ● ● ●",["● ● ●","● ● ● ● ●","● ● ● ●"]),q("w3-1-3","nhap-so","Một chú mèo nặng bằng 3 chú vịt. Hai chú mèo nặng bằng bao nhiêu chú vịt?","6"),q("w3-1-4","nhap-so","Điền số: 7, 8, ..., 10","9"),q("w3-1-5","chon","Hai nhóm 6 hình và 6 hình có số lượng thế nào?","Bằng nhau",["Bằng nhau","Nhóm đầu nhiều hơn","Nhóm sau nhiều hơn"])]),
  taoBai("tuan3-tiet-2","Tiết 2","Lớn nhất, bé nhất",[q("w3-2-1","chon","Số bé nhất: 3, 1, 6, 4, 0, 5","0",["0","1","3"]),q("w3-2-2","chon","Số lớn nhất: 0, 5, 3, 6, 4, 1","6",["4","5","6"]),q("w3-2-3","sap-xep","Sắp xếp từ bé đến lớn: 4, 6, 3, 2, 5, 1","1,2,3,4,5,6"),q("w3-2-4","nhap-so","Có tất cả bao nhiêu số có một chữ số?","10"),q("w3-2-5","sap-xep","Viết các số lớn hơn 5 và bé hơn 9","6,7,8")]),
  taoBai("tuan3-tiet-3","Tiết 3","So sánh số lượng",[q("w3-3-1","chon","Số nào lớn nhất: 9, 10, 4, 8?","10",["8","9","10"]),q("w3-3-2","chon","Số nào bé nhất: 7, 8, 2, 5?","2",["2","5","7"]),q("w3-3-3","sap-xep","Sắp xếp từ bé đến lớn: 7, 5, 2, 9, 4, 10","2,4,5,7,9,10"),q("w3-3-4","nhap-so","Có 10 miếng bánh, lấy đi 4 miếng. Còn bao nhiêu miếng?","6"),q("w3-3-5","so-sanh","Điền dấu: 8 ... 10","<",["<","=",">"])]),
  taoBai("tuan3-tu-luyen","Tự luyện","Ôn tập so sánh",[q("w3-tl-1","sap-xep","Sắp xếp tăng dần: 8, 10, 7, 4, 9, 5","4,5,7,8,9,10"),q("w3-tl-2","nhap-so","Số liền trước của 7 là?","6"),q("w3-tl-3","nhap-so","Số lớn nhất bé hơn 6 là?","5"),q("w3-tl-4","nhap-so","Số bé nhất lớn hơn 6 là?","7"),q("w3-tl-5","nhap-so","Giữa 5 và 8 có bao nhiêu số?","2")]),
  taoBai("tuan3-tham-khao","Tham khảo","Cân bằng thông minh",[q("w3-tk-1","nhap-so","Một hình vuông 3 × 3 còn thiếu 2 ô. Hiện có bao nhiêu ô?","7"),q("w3-tk-2","nhap-so","2 quả bóng nặng bằng 6 khối. 1 quả bóng nặng bằng bao nhiêu khối?","3"),q("w3-tk-3","chon","Số tiếp theo: 2, 4, 6, 8, ...","10",["9","10","11"]),q("w3-tk-4","nhap-so","Có 6 con chim, bay đến thêm 3 con. Có tất cả bao nhiêu con?","9"),q("w3-tk-5","so-sanh","Điền dấu: 10 ... 9",">",["<","=",">"])])
];

const tuan4: BaiHoc[] = [
  taoBai("tuan4-tiet-1","Tiết 1","Dấu lớn hơn, bé hơn, bằng nhau",[q("w4-1-1","so-sanh","7 ... 8","<",["<","=",">"]),q("w4-1-2","so-sanh","5 ... 5","=",["<","=",">"]),q("w4-1-3","so-sanh","9 ... 6",">",["<","=",">"]),q("w4-1-4","so-sanh","0 ... 3","<",["<","=",">"]),q("w4-1-5","sap-xep","Sắp xếp tăng dần: 2, 10, 0, 8, 6, 4","0,2,4,6,8,10")]),
  taoBai("tuan4-tiet-2","Tiết 2","Điền số thích hợp",[q("w4-2-1","nhap-so","Điền một số: 2 < ... < 4","3"),q("w4-2-2","nhap-so","Điền một số: 7 < ... < 9","8"),q("w4-2-3","nhap-so","Điền một số: 10 > ... > 8","9"),q("w4-2-4","so-sanh","6 ... 6","=",["<","=",">"]),q("w4-2-5","sap-xep","Sắp xếp giảm dần: 1, 9, 3, 8, 5, 7, 10","10,9,8,7,5,3,1")]),
  taoBai("tuan4-tiet-3","Tiết 3","Chuỗi so sánh",[q("w4-3-1","nhap-so","Điền số: 3 < ... < 5","4"),q("w4-3-2","nhap-so","Điền số: 9 > ... > 7","8"),q("w4-3-3","chon","Số nào bé hơn 7?","6",["6","7","8"]),q("w4-3-4","chon","Số nào lớn hơn 6?","8",["4","5","8"]),q("w4-3-5","sap-xep","Sắp xếp giảm dần: 7, 5, 6, 9, 4, 3","9,7,6,5,4,3")]),
  taoBai("tuan4-tu-luyen","Tự luyện","Ôn dấu so sánh",[q("w4-tl-1","so-sanh","8 ... 7",">",["<","=",">"]),q("w4-tl-2","so-sanh","6 ... 8","<",["<","=",">"]),q("w4-tl-3","so-sanh","7 ... 7","=",["<","=",">"]),q("w4-tl-4","nhap-so","Điền số: 4 < ... < 6","5"),q("w4-tl-5","sap-xep","Sắp xếp tăng dần: 3, 1, 7, 5, 9, 6","1,3,5,6,7,9")]),
  taoBai("tuan4-tham-khao","Tham khảo","Quy luật hình và số",[q("w4-tk-1","nhap-so","Có 10 viên gạch, bức tường đang có 7 viên. Thiếu bao nhiêu viên?","3"),q("w4-tk-2","chon","Số nào thỏa mãn 4 < số đó < 7?","6",["4","6","8"]),q("w4-tk-3","nhap-so","Điền số tiếp theo: 1, 3, 5, 7, ...","9"),q("w4-tk-4","so-sanh","10 ... 10","=",["<","=",">"]),q("w4-tk-5","sap-xep","Sắp xếp tăng dần: 10, 5, 0","0,5,10")])
];

const tuan5: BaiHoc[] = [
  taoBai("tuan5-tiet-1","Tiết 1","Làm quen phép cộng",[q("w5-1-1","nhap-so","1 + 1 = ?","2"),q("w5-1-2","nhap-so","2 + 1 = ?","3"),q("w5-1-3","nhap-so","1 + 3 = ?","4"),q("w5-1-4","nhap-so","0 + 5 = ?","5"),q("w5-1-5","nhap-so","Có 2 quả cam, thêm 3 quả. Có tất cả bao nhiêu quả?","5")]),
  taoBai("tuan5-tiet-2","Tiết 2","Cộng trong phạm vi 5",[q("w5-2-1","nhap-so","2 + 2 = ?","4"),q("w5-2-2","nhap-so","3 + 2 = ?","5"),q("w5-2-3","nhap-so","Điền số: 3 = 1 + ...","2"),q("w5-2-4","nhap-so","Điền số: ... + 1 = 5","4"),q("w5-2-5","so-sanh","2 + 1 ... 4","<",["<","=",">"])]),
  taoBai("tuan5-tiet-3","Tiết 3","So sánh phép cộng",[q("w5-3-1","so-sanh","2 + 2 ... 4","=",["<","=",">"]),q("w5-3-2","so-sanh","2 + 2 ... 2 + 1",">",["<","=",">"]),q("w5-3-3","nhap-so","Điền số: ... + 2 = 4","2"),q("w5-3-4","nhap-so","Điền số: 1 + ... = 4","3"),q("w5-3-5","nhap-so","3 + 1 = ?","4")]),
  taoBai("tuan5-tu-luyen","Tự luyện","Ôn phép cộng",[q("w5-tl-1","nhap-so","1 + ... = 4","3"),q("w5-tl-2","nhap-so","5 = 2 + ...","3"),q("w5-tl-3","so-sanh","3 + 1 ... 2 + 2","=",["<","=",">"]),q("w5-tl-4","chon","Phép tính nào bằng 5?","2 + 3",["1 + 1","2 + 2","2 + 3"]),q("w5-tl-5","nhap-so","2 + 4 = ?","6")]),
  taoBai("tuan5-tham-khao","Tham khảo","Tổng ba số",[q("w5-tk-1","nhap-so","4 = 1 + 2 + ...","1"),q("w5-tk-2","nhap-so","6 = 2 + 1 + ...","3"),q("w5-tk-3","nhap-so","5 = 2 + 2 + ...","1"),q("w5-tk-4","nhap-so","Điền số: ... + 2 + 3 = 6","1"),q("w5-tk-5","nhap-so","Ba ô liên tiếp có tổng 6. Hai ô đầu là 3 và 2. Ô cuối là?","1")])
];

const tuan6: BaiHoc[] = [
  taoBai("tuan6-tiet-1","Tiết 1","Cộng trong phạm vi 6",[q("w6-1-1","nhap-so","4 + 0 = ?","4"),q("w6-1-2","nhap-so","3 + ... = 4","1"),q("w6-1-3","nhap-so","4 = 1 + ...","3"),q("w6-1-4","so-sanh","1 + 3 ... 3 + 1","=",["<","=",">"]),q("w6-1-5","nhap-so","Ba ô có tổng 5. Hai ô là 0 và 3. Ô còn lại là?","2")]),
  taoBai("tuan6-tiet-2","Tiết 2","Bài toán cộng",[q("w6-2-1","nhap-so","3 + 3 = ?","6"),q("w6-2-2","nhap-so","5 + 0 = ?","5"),q("w6-2-3","nhap-so","Bố mẹ cô Nga có 5 người con: Xuân, Hạ, Thu, Đông và ai?","Nga"),q("w6-2-4","nhap-so","Điền số: 1 + 4 = ...","5"),q("w6-2-5","nhap-so","Điền số: 3 + ... = 6","3")]),
  taoBai("tuan6-tiet-3","Tiết 3","Cộng trong phạm vi 9",[q("w6-3-1","nhap-so","8 + 1 = ?","9"),q("w6-3-2","nhap-so","5 + 4 = ?","9"),q("w6-3-3","nhap-so","3 + 6 = ?","9"),q("w6-3-4","nhap-so","Hiền có 4 bút, Thảo có 5 bút. Cả hai có bao nhiêu bút?","9"),q("w6-3-5","nhap-so","Số ở giữa 7 và 9 là?","8")]),
  taoBai("tuan6-tu-luyen","Tự luyện","Tổng ba số",[q("w6-tl-1","nhap-so","1 + 2 + 5 = ?","8"),q("w6-tl-2","nhap-so","3 + 4 + 1 = ?","8"),q("w6-tl-3","nhap-so","6 + 2 + 1 = ?","9"),q("w6-tl-4","so-sanh","2 + 3 ... 1 + 6","<",["<","=",">"]),q("w6-tl-5","nhap-so","Lan có 4 bóng, Hòa có 5 bóng. Cả hai có?","9")]),
  taoBai("tuan6-tham-khao","Tham khảo","Ô vuông tổng bằng nhau",[q("w6-tk-1","nhap-so","2 + 1 + 2 = ?","5"),q("w6-tk-2","nhap-so","4 + 0 + 1 = ?","5"),q("w6-tk-3","nhap-so","Điền số: 3 + 0 + ... = 5","2"),q("w6-tk-4","chon","Hình tam giác có bao nhiêu cạnh?","3",["3","4","5"]),q("w6-tk-5","chon","Hình vuông quay một vòng có thay đổi hình dạng không?","Không",["Có","Không"])])
];

const tuan7: BaiHoc[] = [
  taoBai("tuan7-tiet-1","Tiết 1","Cộng đến 9",[q("w7-1-1","nhap-so","0 + 3 + 5 = ?","8"),q("w7-1-2","nhap-so","4 + 3 + 1 = ?","8"),q("w7-1-3","nhap-so","5 + 4 + 0 = ?","9"),q("w7-1-4","nhap-so","Điền số: 4 + ... = 8","4"),q("w7-1-5","nhap-so","Có 6 nhãn vở, thêm 3. Có tất cả?","9")]),
  taoBai("tuan7-tiet-2","Tiết 2","Cộng trong phạm vi 10",[q("w7-2-1","nhap-so","6 + 4 = ?","10"),q("w7-2-2","nhap-so","7 + 3 = ?","10"),q("w7-2-3","nhap-so","8 + 2 = ?","10"),q("w7-2-4","nhap-so","9 + 1 = ?","10"),q("w7-2-5","so-sanh","5 + 5 ... 3 + 6",">",["<","=",">"])]),
  taoBai("tuan7-tiet-3","Tiết 3","Nhóm số có tổng cho trước",[q("w7-3-1","nhap-so","1 + 2 = ?","3"),q("w7-3-2","nhap-so","0 + 1 + 2 = ?","3"),q("w7-3-3","so-sanh","0 + 5 ... 1 + 3",">",["<","=",">"]),q("w7-3-4","nhap-so","2 + 2 + 1 = ?","5"),q("w7-3-5","nhap-so","Điền số: 2 + 1 + ... = 5","2")]),
  taoBai("tuan7-tu-luyen","Tự luyện","Ôn cộng đến 10",[q("w7-tl-1","nhap-so","3 + 2 + 5 = ?","10"),q("w7-tl-2","nhap-so","4 + 4 + 2 = ?","10"),q("w7-tl-3","nhap-so","6 + 3 + 1 = ?","10"),q("w7-tl-4","nhap-so","Nam có 7 viên bi, Minh có 3 viên. Hai bạn có?","10"),q("w7-tl-5","nhap-so","Ba số có tổng 9. Hai số là 3 và 2. Số còn lại?","4")]),
  taoBai("tuan7-tham-khao","Tham khảo","Tam giác số",[q("w7-tk-1","nhap-so","3 + 2 + 5 = ?","10"),q("w7-tk-2","nhap-so","6 - 3 = ?","3"),q("w7-tk-3","nhap-so","Điền số: 2 + ... + 5 = 10","3"),q("w7-tk-4","nhap-so","Ba số trên mỗi cạnh có tổng 10. Đã có 2 và 3, số còn lại?","5"),q("w7-tk-5","chon","Phép tính nào bằng 10?","7 + 3",["6 + 3","7 + 3","8 + 1"])])
];

const tuan8: BaiHoc[] = [
  taoBai("tuan8-tiet-1","Tiết 1","Làm quen phép trừ",[q("w8-1-1","nhap-so","3 - 2 = ?","1"),q("w8-1-2","nhap-so","4 - 1 = ?","3"),q("w8-1-3","nhap-so","5 - 3 = ?","2"),q("w8-1-4","nhap-so","4 - 4 = ?","0"),q("w8-1-5","chon","Phép tính nào bằng 3?","5 - 2",["5 - 2","5 - 1","3 - 3"])]),
  taoBai("tuan8-tiet-2","Tiết 2","Cộng và trừ",[q("w8-2-1","so-sanh","4 - 1 ... 2",">",["<","=",">"]),q("w8-2-2","so-sanh","4 - 3 ... 4 - 2","<",["<","=",">"]),q("w8-2-3","chon","Điền dấu: 5 ... 3 = 2","-",["+","-"]),q("w8-2-4","chon","Điền dấu: 3 ... 2 = 5","+",["+","-"]),q("w8-2-5","nhap-so","Viết kết quả: 5 - 1","4")]),
  taoBai("tuan8-tiet-3","Tiết 3","Tính liên tiếp",[q("w8-3-1","nhap-so","5 - 2 + 1 = ?","4"),q("w8-3-2","nhap-so","3 - 3 + 5 = ?","5"),q("w8-3-3","nhap-so","2 + 3 - 3 = ?","2"),q("w8-3-4","nhap-so","4 + 0 - 2 = ?","2"),q("w8-3-5","nhap-so","1 + 4 - 2 = ?","3")]),
  taoBai("tuan8-tu-luyen","Tự luyện","Ôn cộng trừ phạm vi 5",[q("w8-tl-1","nhap-so","5 - 2 - 1 = ?","2"),q("w8-tl-2","nhap-so","4 - 2 + 3 = ?","5"),q("w8-tl-3","nhap-so","4 + 0 - 3 = ?","1"),q("w8-tl-4","nhap-so","5 - 2 - 2 = ?","1"),q("w8-tl-5","chon","Phép tính nào đúng?","5 - 2 = 3",["5 - 2 = 3","5 - 1 = 3","4 - 1 = 2"])]),
  taoBai("tuan8-tham-khao","Tham khảo","Điền dấu bí mật",[q("w8-tk-1","chon","Điền dấu: 5 ... 1 ... 1 = 5","- rồi +",["+ rồi +","- rồi +","- rồi -"]),q("w8-tk-2","nhap-so","3 - ... = 2","1"),q("w8-tk-3","nhap-so","5 = 2 + ...","3"),q("w8-tk-4","so-sanh","4 - 2 ... 3 - 1","=",["<","=",">"]),q("w8-tk-5","nhap-so","Có 5 khối, bỏ 2 khối. Còn lại?","3")])
];

const tuan9: BaiHoc[] = [
  taoBai("tuan9-tiet-1","Tiết 1","Trừ trong phạm vi 6",[q("w9-1-1","nhap-so","6 - 1 = ?","5"),q("w9-1-2","nhap-so","6 - 2 = ?","4"),q("w9-1-3","nhap-so","6 - 3 = ?","3"),q("w9-1-4","nhap-so","6 - 4 = ?","2"),q("w9-1-5","chon","Phép tính nào bằng 1?","5 - 4",["6 - 4","5 - 4","6 - 3"])]),
  taoBai("tuan9-tiet-2","Tiết 2","Cộng trừ liên tiếp",[q("w9-2-1","nhap-so","6 - 2 - 0 = ?","4"),q("w9-2-2","nhap-so","5 - 3 - 1 = ?","1"),q("w9-2-3","nhap-so","3 + 2 - 2 = ?","3"),q("w9-2-4","nhap-so","4 + 1 - 5 = ?","0"),q("w9-2-5","nhap-so","5 - 4 + 2 = ?","3")]),
  taoBai("tuan9-tiet-3","Tiết 3","Lập phép tính đúng",[q("w9-3-1","nhap-so","1 + 5 = ?","6"),q("w9-3-2","nhap-so","6 - 5 = ?","1"),q("w9-3-3","so-sanh","2 + 4 ... 6 - 0","=",["<","=",">"]),q("w9-3-4","so-sanh","3 + 2 ... 6 - 2",">",["<","=",">"]),q("w9-3-5","nhap-so","2 + 1 + 4 = ?","7")]),
  taoBai("tuan9-tu-luyen","Tự luyện","Ôn cộng trừ phạm vi 6",[q("w9-tl-1","nhap-so","6 - ... = 4","2"),q("w9-tl-2","nhap-so","... - 3 = 3","6"),q("w9-tl-3","nhap-so","... - 5 = 1","6"),q("w9-tl-4","nhap-so","4 + ... = 6","2"),q("w9-tl-5","so-sanh","5 + 1 ... 6 - 0","=",["<","=",">"])]),
  taoBai("tuan9-tham-khao","Tham khảo","Bài toán tổng hợp",[q("w9-tk-1","nhap-so","Ô tô có 6 khách, 2 người xuống, 3 người lên. Có bao nhiêu khách?","7"),q("w9-tk-2","nhap-so","6 - 3 + 2 = ?","5"),q("w9-tk-3","nhap-so","Điền số: 6 - 3 < ... < 1 + 6","4"),q("w9-tk-4","chon","Số nào không cần dùng để lập 1 + 3 = 4?","5",["1","3","4","5"]),q("w9-tk-5","nhap-so","5 - 2 + 4 = ?","7")])
];

const cacTuanNoiDung = [tuan1, tuan2, tuan3, tuan4, tuan5, tuan6, tuan7, tuan8, tuan9];
const chuDe = [
  "Làm quen số 0 đến 10", "Dãy số và số liền trước, liền sau", "So sánh số lượng", "Dấu lớn hơn, bé hơn, bằng nhau",
  "Phép cộng ban đầu", "Cộng trong phạm vi 9", "Cộng trong phạm vi 10", "Phép trừ trong phạm vi 5", "Cộng trừ trong phạm vi 6",
];

export const cacTuanHoc: TuanHoc[] = chuDe.map((moTa, index) => ({
  so: index + 1,
  ten: `Tuần ${index + 1}`,
  moTa,
  moKhoa: true,
  baiHoc: cacTuanNoiDung[index],
}));
