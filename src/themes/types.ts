export type BaiVietTheme = {
  id: string;
  tieu_de: string;
  duong_dan: string;
  tom_tat: string | null;
  google_drive_anh_dai_dien_file_id: string | null;
  ngay_dang: string | null;
  luot_xem: number;
};

export type DeMucTheme = {
  id: string;
  ten_de_muc: string;
  duong_dan: string;
};

export type DuLieuTrangChuTheme = {
  tenWebsite: string;
  moTaWebsite: string;
  danhSachBaiViet: BaiVietTheme[];
  danhSachDeMuc: DeMucTheme[];
};
