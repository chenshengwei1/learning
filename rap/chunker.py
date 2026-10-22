# rag/chunker.py
import re
from pathlib import Path

def read_document(path: str) -> str:
    """读取文档，目前支持 txt / md，PDF 可自行扩展。"""
    p = Path(path)
    if p.suffix.lower() in {".txt", ".md"}:
        return p.read_text(encoding="utf-8")
    if p.suffix.lower() == ".pdf":
        from pypdf import PdfReader
        reader = PdfReader(path)
        for page in reader.pages:
            print(f'page:{page}')
        return read_pdf2(path)
    raise ValueError(f"不支持的文件类型: {p.suffix}")

def read_pdf(path: str) -> str:
    from pypdf import PdfReader
    reader = PdfReader(path)
    text = "\n".join(page.extract_text() or "" for page in reader.pages)
    
    if len(text.strip()) < 50:  # 几乎没提取到文字，按扫描件处理
        import pymupdf  # pymupdf
        import pytesseract
        from PIL import Image
        import io
        
        doc = pymupdf.open(path)
        ocr_parts = []
        for page in doc:
            pix = page.get_pixmap(dpi=200)  # 200 DPI 对 OCR 比较稳妥
            img = Image.open(io.BytesIO(pix.tobytes("png")))
            ocr_parts.append(pytesseract.image_to_string(img, lang="chi_sim+eng"))
        doc.close()
        text = "\n".join(ocr_parts)
    
    return text

def read_pdf2(path: str):
    import fitz  # pymupdf
    from pyturboocr import OCR

    ocr = OCR(tier="medium")  # 如果 tiny 效果不够好，可以换 small 或 medium
    doc = fitz.open(path)

    all_text = []
    for page in doc:
        pix = page.get_pixmap(dpi=200)
        img_path = f"temp_page_{page.number}.png"
        pix.save(img_path)
        result = ocr.recognize_image(img_path)
        print(f'read pdf2={result.text}')
        all_text.append(result.text)

    doc.close()
    full_text = "\n".join(all_text)
    return full_text

def split_text(text: str, chunk_size: int = 400, overlap: int = 80) -> list[str]:
    """
    按段落优先切块，段落过长再按字符硬切。
    保证每块不超过 chunk_size，块间有 overlap 字符重叠。
    """
    # 先按空行/换行拆成段落，过滤空白
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n|\n", text) if p.strip()]

    chunks, buf = [], ""
    for para in paragraphs:
        # 段落本身超长，先硬切
        if len(para) > chunk_size:
            if buf:
                chunks.append(buf)
                buf = ""
            for i in range(0, len(para), chunk_size - overlap):
                chunks.append(para[i:i + chunk_size])
            continue

        # 尝试拼进当前块
        if len(buf) + len(para) + 1 <= chunk_size:
            buf = f"{buf}\n{para}" if buf else para
        else:
            chunks.append(buf)
            # 新块带上上一块尾部 overlap 字符
            tail = buf[-overlap:] if overlap and len(buf) > overlap else buf
            buf = f"{tail}\n{para}" if tail else para

    if buf:
        chunks.append(buf)

    return [c for c in chunks if c.strip()]