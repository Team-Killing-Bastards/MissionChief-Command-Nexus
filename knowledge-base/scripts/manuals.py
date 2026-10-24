"""Build both PDFs from the same HTML emitted by the website build."""
from pathlib import Path
from html.parser import HTMLParser
from html import escape, unescape
import json, re, hashlib
from urllib.parse import urljoin
from reportlab.platypus import BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, PageBreak, Image, KeepTogether
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor, white
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

ROOT=Path(__file__).resolve().parents[1]
DATA=json.loads((ROOT/'dist/manual-source.json').read_text(encoding='utf-8'))
CFG=DATA['config']
OUT=ROOT/'dist/downloads'
OUT.mkdir(parents=True, exist_ok=True)
for font in ('Arial','ArialBold'):
    file=Path('C:/Windows/Fonts')/('arial.ttf' if font=='Arial' else 'arialbd.ttf')
    if file.exists(): pdfmetrics.registerFont(TTFont(font,str(file)))
BODY='Arial' if 'Arial' in pdfmetrics.getRegisteredFontNames() else 'Helvetica'
BOLD='ArialBold' if 'ArialBold' in pdfmetrics.getRegisteredFontNames() else 'Helvetica-Bold'
if BODY=='Arial': pdfmetrics.registerFontFamily('Arial',normal=BODY,bold=BOLD,italic=BODY,boldItalic=BOLD)
styles=getSampleStyleSheet()
styles.add(ParagraphStyle(name='Body',fontName=BODY,fontSize=10,leading=15,textColor=HexColor('#24364b'),spaceAfter=10))
styles.add(ParagraphStyle(name='Lead',parent=styles['Body'],fontSize=12,leading=18,textColor=HexColor('#526b83'),spaceAfter=19,keepWithNext=True))
styles.add(ParagraphStyle(name='Chapter',fontName=BOLD,fontSize=25,leading=31,textColor=HexColor('#102338'),spaceAfter=17,keepWithNext=True))
styles.add(ParagraphStyle(name='Section',fontName=BOLD,fontSize=14,leading=19,textColor=HexColor('#143e59'),spaceBefore=15,spaceAfter=9,keepWithNext=True))
styles.add(ParagraphStyle(name='Subsection',parent=styles['Section'],fontSize=11,leading=16))
styles.add(ParagraphStyle(name='ListItemNexus',parent=styles['Body'],leftIndent=19,firstLineIndent=-16,spaceAfter=8))
styles.add(ParagraphStyle(name='WarningNexus',parent=styles['Body'],backColor=HexColor('#fff4df'),borderPadding=10,spaceBefore=9,spaceAfter=15))
styles.add(ParagraphStyle(name='CaptionNexus',parent=styles['Body'],fontSize=8,leading=12,textColor=HexColor('#526b83')))
styles.add(ParagraphStyle(name='CoverTitleNexus',fontName=BOLD,fontSize=34,leading=41,textColor=HexColor('#102338'),spaceAfter=22))
styles.add(ParagraphStyle(name='TocNexus',fontName=BODY,fontSize=11,leading=19,spaceBefore=8,leftIndent=0))

def clean(text):
    return str(text).replace('\u2011','-').replace('\u2013','-').replace('\u2014',' - ').replace('\u2192',' > ').replace('\u2026','...')

class Manual(BaseDocTemplate):
    def __init__(self,file,title):
        super().__init__(str(file),pagesize=A4,leftMargin=48,rightMargin=48,topMargin=57,bottomMargin=48,title=title+' - Review edition',author='MissionChief Command Nexus')
        self.manual_title=title
        frame=Frame(self.leftMargin,self.bottomMargin,self.width,self.height,id='main',leftPadding=0,rightPadding=0,topPadding=0,bottomPadding=0)
        self.addPageTemplates(PageTemplate(id='normal',frames=frame,onPage=self.page))
        self.heading_number=0
    def page(self,c,doc):
        w,h=A4
        c.saveState()
        c.setFillColor(HexColor('#08101e'));c.rect(0,h-34,w,34,fill=1,stroke=0)
        c.setFont(BOLD,9);c.setFillColor(white);c.drawString(48,h-22,'COMMAND NEXUS')
        c.setFont(BODY,8);c.drawRightString(w-48,h-22,'USER DOCUMENTATION | REVIEW EDITION')
        c.setStrokeColor(HexColor('#d3dce6'));c.line(48,38,w-48,38)
        c.setFillColor(HexColor('#526b83'));c.setFont(BODY,7)
        c.drawString(48,25,'Source '+CFG['sourceVersion']+' (local test) | '+CFG['revision'])
        c.drawRightString(w-48,25,str(doc.page))
        c.restoreState()
    def afterFlowable(self,f):
        if getattr(f,'toc',False):
            self.heading_number+=1
            key='entry-'+str(self.heading_number)
            self.canv.bookmarkPage(key)
            self.canv.addOutlineEntry(f.getPlainText(),key,level=0,closed=False)
            self.notify('TOCEntry',(0,f.getPlainText(),self.page,key))
    def beforeDocument(self):
        self.heading_number=0

def heading(text,toc=True,chapter=False):
    p=Paragraph(escape(clean(text)),styles['Chapter' if chapter else 'Section']);p.toc=toc;return p

class FlowParser(HTMLParser):
    def __init__(self,quick=False):
        super().__init__(convert_charrefs=True);self.flow=[];self.parts=[];self.block=None;self.lists=[];self.quote=False;self.quick=quick;self.section_count=0
    def flush(self):
        value=''.join(self.parts).strip();kind=self.block;self.parts=[];self.block=None
        if not value:return
        if kind in ('h2','h3'):
            if self.quick and kind=='h2' and self.section_count and self.section_count % 2 == 0:
                self.flow.append(PageBreak())
            p=Paragraph(value,styles['Section' if kind=='h2' else 'Subsection'])
            p.toc=self.quick and kind=='h2'
            self.flow.append(p)
            if kind=='h2':self.section_count+=1
        else:
            style='WarningNexus' if self.quote else 'ListItemNexus' if kind=='li' else 'Body'
            self.flow.append(Paragraph(value,styles[style]))
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        if tag in ('h2','h3','p','li'):
            # Marked can wrap multi-paragraph list items. Do not discard the active list marker.
            if tag=='p' and self.block=='li':return
            self.flush();self.block=tag
            if tag=='li':
                if self.lists and self.lists[-1][0]=='ol':
                    self.lists[-1][1]+=1;self.parts.append(str(self.lists[-1][1])+'. ')
                else:self.parts.append('&#8226; ')
        elif tag in ('ul','ol'):
            self.flush();self.lists.append([tag,0])
        elif tag=='blockquote':
            self.flush();self.quote=True
        elif tag in ('strong','b'):self.parts.append('<b>')
        elif tag in ('em','i'):self.parts.append('<i>')
        elif tag=='code':self.parts.append('<font name="'+BODY+'">')
        elif tag=='a':
            href=urljoin(CFG['origin'],attrs.get('href',''))
            self.parts.append('<a href="'+escape(href,quote=True)+'" color="#17648a">')
        elif tag=='br':self.parts.append('<br/>')
        elif tag=='img':
            self.flush()
            relative=attrs['src'].removeprefix('/guide/')
            file=(ROOT/'dist'/relative).resolve()
            if not file.is_relative_to((ROOT/'dist').resolve()) or not file.exists():raise ValueError('Missing screenshot: '+relative)
            im=Image(str(file));scale=min(499/im.imageWidth,300/im.imageHeight,1)
            im.drawWidth=im.imageWidth*scale;im.drawHeight=im.imageHeight*scale
            self.flow.extend([im,Paragraph(escape(clean(attrs.get('alt',''))),styles['CaptionNexus'])])
    def handle_endtag(self,tag):
        if tag in ('h2','h3','li'):self.flush()
        elif tag=='p':
            if self.block!='li':self.flush()
        elif tag in ('ul','ol'):
            self.flush()
            if self.lists:self.lists.pop()
        elif tag=='blockquote':self.flush();self.quote=False
        elif tag in ('strong','b'):self.parts.append('</b>')
        elif tag in ('em','i'):self.parts.append('</i>')
        elif tag=='code':self.parts.append('</font>')
        elif tag=='a':self.parts.append('</a>')
    def handle_data(self,data):
        if self.block:self.parts.append(escape(clean(data)))

def make(filename,title,quick=False):
    story=[Spacer(1,68),Paragraph('MISSIONCHIEF COMMAND NEXUS',styles['Section']),Paragraph(title,styles['CoverTitleNexus']),
       Paragraph('REVIEW EDITION',styles['Section']),
       Paragraph('Local source '+CFG['sourceVersion']+' | Revision '+CFG['revision'],styles['Lead']),
       Paragraph('A practical route through setup, fleet administration and mission dispatch.',styles['Lead']),
       Paragraph('Current Chrome Store version is unverified. GitHub main records .205; the locally audited .235 is a test build. Live screenshots and end-to-end game verification remain outstanding.',styles['WarningNexus']),
       Paragraph('Both manuals and the website use the same documentation source. This review must not be treated as a complete live-validated manual.',styles['Body']),
       Paragraph('<a href="'+CFG['origin']+'/guide/" color="#17648a">nexus.blyth.scot/guide</a> - proposed publication route, not yet deployed',styles['Body']),PageBreak(),
       heading('Contents',toc=False,chapter=True)]
    toc=TableOfContents();toc.levelStyles=[styles['TocNexus']];story.extend([toc,PageBreak()])
    articles=[a for a in DATA['articles'] if a['slug']=='quick-start'] if quick else [a for a in DATA['articles'] if a['slug'] not in ('index','quick-start','downloads')]
    for index,a in enumerate(articles):
        if index and not quick:story.append(Spacer(1,16))
        if not quick:story.extend([heading(a['title'],chapter=True),Paragraph(escape(clean(a['description'])),styles['Lead'])])
        parser=FlowParser(quick);parser.feed(a['html']);parser.flush();story.extend(parser.flow)
    doc=Manual(OUT/filename,title);doc.multiBuild(story)
    return OUT/filename

if __name__=='__main__':
    files=[make('Nexus-Quick-Start.pdf','Quick Start Guide',True),make('Nexus-Complete-User-Manual.pdf','Complete User Manual')]
    evidence={'source_sha256':hashlib.sha256((ROOT/'dist/manual-source.json').read_bytes()).hexdigest(),'source_version':CFG['sourceVersion'],'revision':CFG['revision'],'edition':CFG['edition'],'files':[]}
    from pypdf import PdfReader
    for file in files:
        reader=PdfReader(str(file))
        links=sum(len(page.get('/Annots',[])) for page in reader.pages)
        evidence['files'].append({'name':file.name,'pages':len(reader.pages),'links':links,'sha256':hashlib.sha256(file.read_bytes()).hexdigest()})
        print(file.name,len(reader.pages),'pages',links,'links')
    (OUT/'pdf-build.json').write_text(json.dumps(evidence,indent=2),encoding='utf-8')
