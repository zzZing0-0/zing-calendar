export function downloadTextFile(filename:string,text:string,mimeType:string) {
  const blob=new Blob(['\ufeff',text],{type:mimeType}), url=URL.createObjectURL(blob), link=document.createElement('a')
  link.href=url; link.download=filename; document.body.appendChild(link); link.click(); link.remove()
  setTimeout(()=>URL.revokeObjectURL(url),1000)
}
