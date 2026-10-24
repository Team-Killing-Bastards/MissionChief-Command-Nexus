from pathlib import Path
import pypdfium2 as pdfium
from PIL import Image, ImageOps, ImageDraw
root=Path(__file__).resolve().parents[1]
out=root/'qa/pdf'
out.mkdir(parents=True,exist_ok=True)
for file in (root/'dist/downloads').glob('*.pdf'):
    document=pdfium.PdfDocument(str(file))
    thumbs=[]
    for number,page in enumerate(document):
        image=page.render(scale=1.15).to_pil()
        image.save(out/(file.stem+'-'+str(number+1).zfill(2)+'.png'))
        thumb=image.copy()
        thumb.thumbnail((238,338))
        tile=Image.new('RGB',(258,366),'#d9e0e9')
        tile.paste(thumb,((258-thumb.width)//2,8))
        ImageDraw.Draw(tile).text((12,348),'Page '+str(number+1),fill='#122338')
        thumbs.append(tile)
    cols=3 if len(thumbs)<=10 else 4
    rows=(len(thumbs)+cols-1)//cols
    sheet=Image.new('RGB',(cols*258,rows*366),'#d9e0e9')
    for n,tile in enumerate(thumbs):sheet.paste(tile,((n%cols)*258,(n//cols)*366))
    sheet.save(out/(file.stem+'-contact.png'))
    print(file.name,len(document),'pages rendered')
