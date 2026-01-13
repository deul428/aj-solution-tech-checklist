
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
      QRCode.toDataURL(data.mgmtNumber, { margin: 1, width: 300 })
        .then(url => setQrUrl(url))
        .catch(err => console.error('QR Generate Error:', err));
    }
  }, [data.mgmtNumber]);

  return (
    <div className="checklist-preview-item bg-white p-6 border border-gray-100 w-[210mm] mx-auto my-4 font-sans text-black overflow-hidden box-border shadow-sm">
      
      {/* Excel Row 1 & 2: Title & Mgmt No */}
      <div className="flex justify-between items-end mb-1 px-1">
        <h2 className="text-[28px] font-bold leading-none tracking-tight">
          상품/임가/경,중 체크리스트
        </h2>
      </div>
      
      {/* Row 2: Fixed Black Separator */} 

      {/* Row 3, 4: Signatures & QR Section */}
      <div className="flex justify-between items-start mb-4 px-1">
        <div className="grid grid-cols-2 gap-x-12 gap-y-2 flex-1">
          {/* Using border-black for better PDF visibility */}
          <div className="flex items-end gap-2 pb-1 h-14">
            <span className="text-sm font-bold whitespace-nowrap">정비자:</span>
            <div className="flex-1"></div>
          </div>
          <div className="flex items-end gap-2 pb-1 h-14">
            <span className="text-sm font-bold whitespace-nowrap">QC:</span>
            <div className="flex-1"></div>
          </div>
          <div className="flex items-end gap-2 pb-1 h-14">
            <span className="text-sm font-bold whitespace-nowrap">정비 일자:</span>
            <div className="flex-1 text-gray-400 text-sm">20 . . .</div>
          </div>
          <div className="flex items-end gap-2 pb-1 h-14">
            <span className="text-sm font-bold whitespace-nowrap">QC 일자:</span>
            <div className="flex-1 text-gray-400 text-sm">20 . . .</div>
          </div>
        </div>
        
        {/* QR Section - Styled to match image capture constraints */}
        <div className="ml-8 p-1 bg-white flex items-center justify-center">
          {qrUrl ? (
            <div className="flex flex-col items-center gap-0.5"> 
              <img src={qrUrl} alt="QR" className="w-24 h-24 block" />
              <div className="text-right">
                <span className="text-base font-bold text-xs">관리번호: {data.mgmtNumber}</span>
              </div>
            </div>
          ) : (
            <div className="w-24 h-24 bg-gray-50" />
          )}
        </div>
      </div>

      {/* Main Table: Strict 8-column layout (1/8 = 12.5% each) */}
      <div className="w-full mb-6">
        <table className="w-full border-t border-l border-black text-[14px] text-center table-fixed border-separate border-spacing-0">
          <colgroup>
            <col className="w-[12.5%]" />
            <col className="w-[12.5%]" />
            <col className="w-[12.5%]" />
            <col className="w-[12.5%]" />
            <col className="w-[12.5%]" />
            <col className="w-[12.5%]" />
            <col className="w-[12.5%]" />
            <col className="w-[12.5%]" />
          </colgroup>
          <tbody>
            {/* Row 6: Code(2) & Name(6) */}
            <tr className="h-12">
              <td className="bg-gray-100 font-bold border-r border-b border-black px-1">상품코드</td>
              <td className="border-r border-b border-black font-bold px-1 overflow-hidden truncate">{data.productCode}</td>
              <td className="bg-gray-100 font-bold border-r border-b border-black px-1">상품명</td>
              <td className="text-left px-3 font-bold border-r border-b border-black" colSpan={5}>{data.productName}</td>
            </tr>
            {/* Row 7: Mfg, Model, Year, Usage (All 1 col each) */}
            <tr className="h-12">
              <td className="bg-gray-100 font-bold border-r border-b border-black px-1 align-middle">제조사</td>
              <td className="border-r border-b border-black font-bold px-1 overflow-hidden truncate align-middle">{data.manufacturer}</td>
              <td className="bg-gray-100 font-bold border-r border-b border-black px-1 align-middle">모델</td>
              <td className="border-r border-b border-black font-bold px-1 overflow-hidden truncate align-middle">{data.model}</td>
              <td className="bg-gray-100 font-bold border-r border-b border-black px-1 align-middle">년식</td>
              <td className="border-r border-b border-black font-bold px-1 align-middle">{data.year}</td>
              <td className="bg-gray-100 font-bold border-r border-b border-black px-1 align-middle">사용시간</td>
              <td className="border-r border-b border-black font-bold px-1 align-middle"></td>
            </tr>
            {/* Row 8: Asset(2), Vehicle(2), Serial(4) */}
            <tr className="h-12">
              <td className="bg-gray-100 font-bold border-r border-b border-black px-1">자산번호</td>
              <td className="border-r border-b border-black font-bold px-1 overflow-hidden truncate">{data.assetNumber}</td>
              <td className="bg-gray-100 font-bold border-r border-b border-black px-1">차량번호</td>
              <td className="border-r border-b border-black font-bold px-1 overflow-hidden truncate">{data.vehicleNumber}</td>
              <td className="bg-gray-100 font-bold border-r border-b border-black px-1">차대번호</td>
              <td className="text-left px-3 font-bold border-r border-b border-black" colSpan={3}>{data.serialNumber}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer Row (Excel Row 9) */}
      <div className="flex justify-between items-center px-2 h-12">
        <div className="flex gap-10">
          <div className="flex items-center gap-2">
            <span className="font-bold text-base">물류:</span>
            <span className={`w-12 h-8 flex items-center justify-center text-2xl font-black ${data.category === '물류' ? 'text-black' : 'text-transparent'}`}>
              O
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-base">건설:</span>
            <span className={`w-12 h-8 flex items-center justify-center text-xl font-black ${data.category === '건설' ? 'text-black' : 'text-transparent'}`}>
              O
            </span>
          </div>
        </div>
        <div className="text-sm">
          양호: o &nbsp; 보통: △ &nbsp; 불량: x &nbsp; 해당없음: N
        </div>
      </div>
    </div>
  );
};

export default ChecklistPreview;
