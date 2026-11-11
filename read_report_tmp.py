import zipfile
import xml.etree.ElementTree as ET

with zipfile.ZipFile('docs/Hackhub_test_report.docx') as doc:
    root = ET.fromstring(doc.read('word/document.xml'))
ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
for p in root.findall('.//w:p', ns):
    text = ''.join(t.text or '' for t in p.findall('.//w:t', ns))
    if text:
        print(text)
