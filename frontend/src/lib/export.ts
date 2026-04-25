import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

export const exportToExcel = (data: any[], filename: string) => {
  try {
    if (!data || data.length === 0) {
      toast.error('Không có dữ liệu để xuất');
      return;
    }
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, `${filename}.xlsx`);
    toast.success('Xuất file Excel thành công');
  } catch (error) {
    console.error(error);
    toast.error('Lỗi khi xuất file Excel');
  }
};

export const exportToPDF = () => {
  // Thay vi dung thu vien PDF ko ho tro tieng Viet tot, 
  // ta su dung chuc nang in cua trinh duyet (Luu thanh PDF)
  window.print();
};
