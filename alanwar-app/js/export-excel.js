// ============================================================
// export-excel.js — Fungsi Global Cetak Tabel ke Excel (SheetJS)
// ============================================================

window.exportToExcel = function (dataArray, fileName = 'Export_Data') {
  if (!dataArray || dataArray.length === 0) {
    alert('Tidak ada data untuk di-export.');
    return;
  }

  // Buat workbook dan worksheet menggunakan SheetJS (XLSX)
  const worksheet = XLSX.utils.json_to_sheet(dataArray);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data");

  // Download file
  XLSX.writeFile(workbook, `${fileName}_${new Date().toLocaleDateString('id-ID').replace(/\//g, '-')}.xlsx`);
};
