
import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { ChecklistData } from '../types';

interface ChecklistPreviewProps {
  data: ChecklistData;
}

const ChecklistPreview: React.FC<ChecklistPreviewProps> = ({ data }) => {
  const [qrUrl, setQrUrl] = useState<string>('');

  useEffect(() => {
    if (data.mgmtNumber) {
      QRCode.toDataURL(data.mgmtNumber, { margin: 1, width: 200 })
        .then(url => setQrUrl(url))
        .catch(err => console.error('QR Generate Error:', err));
    }
  }, [data.mgmtNumber]);
  // 오늘 날짜
  const today = new Date();
  // 년도
  const year = today.getFullYear();
  // 월
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  // 일
  const day = today.getDate().toString().padStart(2, '0');
  //yyyy-mm-dd
  const yyyy_mm_dd = `${year}.${month}.${day}`;
  return (
    <div className="bg-white p-8 border border-gray-200 rounded-xl shadow-lg max-w-5xl mx-auto my-6 font-sans relative">

      {/* Header Row: Title & Mgmt No */}
      <div className="flex justify-between items-end mb-4 border-b-2 border-black pb-2">
        <h2 className="text-3xl font-bold text-black">
          상품/임가/경,중 체크리스트
        </h2>
        <div className="text-sm font-medium mb-1">
          관리번호: <span className="font-bold underline">{data.mgmtNumber}</span>
        </div>
      </div>

      {/* Info Row & QR Code Area */}
      <div className="flex justify-between items-start mb-6 h-28">
        {/* Labels on the left */}
        <div className="flex flex-1 gap-8 text-sm pt-4">
          <div>점검일자: <span className="border-b border-gray-400 inline-block w-32 ml-1">{yyyy_mm_dd}</span></div>
          <div>정비자: <span className="border-b border-gray-400 inline-block w-32 ml-1"></span></div>
          <div>QC: <span className="border-b border-gray-400 inline-block w-32 ml-1"></span></div>
        </div>

        {/* QR Code on the right (directly under Mgmt No position) */}
        {qrUrl && (
          <div className="flex flex-col items-center mr-2">
            <img src={qrUrl} alt="QR Code" className="w-24 h-24 border border-gray-100 shadow-sm" />
          </div>
        )}
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border-2 border-black text-sm text-center">
          <tbody>
            {/* Row 1 */}
            <tr className="border-b border-black h-12">
              <td className="bg-gray-50 font-bold border-r border-black w-24">상품코드</td>
              <td className="border-r border-black w-32">{data.productCode}</td>
              <td className="bg-gray-50 font-bold border-r border-black w-24">상품명</td>
              <td className="text-left px-3" colSpan={5}>{data.productName}</td>
            </tr>
            {/* Row 2 */}
            <tr className="border-b border-black h-12">
              <td className="bg-gray-50 font-bold border-r border-black w-24">제조사</td>
              <td className="border-r border-black w-32">{data.manufacturer}</td>
              <td className="bg-gray-50 font-bold border-r border-black w-24">모델</td>
              <td className="border-r border-black w-32">{data.model}</td>
              <td className="bg-gray-50 font-bold border-r border-black w-24">년식</td>
              <td className="border-r border-black w-24">{data.year}</td>
              <td className="bg-gray-50 font-bold border-r border-black w-24">사용시간</td>
              <td className="w-24"></td>
            </tr>
            {/* Row 3 */}
            <tr className="h-12">
              <td className="bg-gray-50 font-bold border-r border-black w-24">자산번호</td>
              <td className="border-r border-black w-32">{data.assetNumber}</td>
              <td className="bg-gray-50 font-bold border-r border-black w-24">차량번호</td>
              <td className="border-r border-black w-32">{data.vehicleNumber}</td>
              <td className="bg-gray-50 font-bold border-r border-black w-24">차대번호</td>
              <td className="text-left px-3" colSpan={3}>{data.serialNumber}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer Row */}
      <div className="mt-4 flex justify-between text-sm items-center px-1">
        <div className="flex gap-12">
          <div>물류: <span className="border-b border-gray-400 inline-block w-24 ml-1"></span></div>
          <div>건설: <span className="border-b border-gray-400 inline-block w-24 ml-1"></span></div>
        </div>
        <div className="text-gray-700 font-medium">
          양호: o &nbsp;&nbsp; 보통: △ &nbsp;&nbsp; 불량: x &nbsp;&nbsp; 해당없음: N
        </div>
      </div>
    </div>
  );
};

export default ChecklistPreview;
