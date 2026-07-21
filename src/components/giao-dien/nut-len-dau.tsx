"use client";
import { useEffect,useState } from "react";
export function NutLenDau(){const [hien,setHien]=useState(false);useEffect(()=>{const f=()=>setHien(scrollY>500);addEventListener("scroll",f);f();return()=>removeEventListener("scroll",f)},[]);if(!hien)return null;return <button onClick={()=>scrollTo({top:0,behavior:"smooth"})} className="fixed bottom-5 left-5 z-50 h-11 w-11 rounded-full bg-slate-900 font-black text-white shadow-lg" aria-label="Lên đầu trang">↑</button>}
