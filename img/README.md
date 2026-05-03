# Folder IMG — Aset Gambar

Letakkan file logo di sini dengan nama:
  - logo.png   → Logo utama pesantren (disarankan 200x200px, format PNG transparan)
  - logo.svg   → Versi SVG logo (opsional, lebih tajam di semua ukuran)
  - favicon.ico → Icon tab browser (16x16 atau 32x32px)

Cara mengganti logo di app:
  1. Taruh file logo.png di folder ini
  2. Buka index.html, cari <!-- LOGO -->
  3. Ganti elemen SVG dengan: <img src="img/logo.png" alt="Logo" width="60" height="60">

Cara mengganti favicon:
  1. Taruh favicon.ico di folder ini
  2. Tambahkan di <head> index.html:
     <link rel="icon" href="img/favicon.ico">
