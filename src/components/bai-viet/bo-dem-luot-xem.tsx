"use client";

import { useEffect, useState } from "react";

type ThuocTinh = {
  baiVietId: string;
  luotXemBanDau: number;
};

export function BoDemLuotXem({
  baiVietId,
  luotXemBanDau,
}: ThuocTinh) {
  const [luotXem, setLuotXem] = useState(luotXemBanDau);

  useEffect(() => {
    const khoa = `da-xem-bai-viet-${baiVietId}`;

    if (window.sessionStorage.getItem(khoa)) {
      return;
    }

    window.sessionStorage.setItem(khoa, "1");

    fetch(`/api/bai-viet/${baiVietId}/luot-xem`, {
      method: "POST",
    })
      .then((phanHoi) => phanHoi.json())
      .then((ketQua) => {
        if (ketQua.thanh_cong) {
          setLuotXem(Number(ketQua.luot_xem) || luotXemBanDau);
        } else {
          window.sessionStorage.removeItem(khoa);
        }
      })
      .catch(() => {
        window.sessionStorage.removeItem(khoa);
      });
  }, [baiVietId, luotXemBanDau]);

  return <span>{luotXem} lượt xem</span>;
}
