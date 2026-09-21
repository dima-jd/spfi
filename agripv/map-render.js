import {intersects} from './map-data.js';
export function drawRecords(map,rows,onSelect,lang){
 const group=L.featureGroup().addTo(map),bounds=map.getBounds(),viewport=[bounds.getWest(),bounds.getSouth(),bounds.getEast(),bounds.getNorth()];
 const large=rows.length>1200,overview=large&&map.getZoom()<11;
 const color=r=>({projects:'#153eeb',plans:'#bc7420',candidates:'#247953',industrial:'#7954a1',public:'#087c8e'})[r.layer];let failed=0;
 if(overview){const cells=new Map(),size=map.getZoom()<8?.3:.08;for(const r of rows){if(!r.extent)continue;const x=(r.extent[0]+r.extent[2])/2,y=(r.extent[1]+r.extent[3])/2,key=Math.floor(x/size)+','+Math.floor(y/size);const cell=cells.get(key)||{x:0,y:0,count:0,extent:[180,90,-180,-90]};cell.x+=x;cell.y+=y;cell.count++;cell.extent=[Math.min(cell.extent[0],r.extent[0]),Math.min(cell.extent[1],r.extent[1]),Math.max(cell.extent[2],r.extent[2]),Math.max(cell.extent[3],r.extent[3])];cells.set(key,cell);}
 for(const cell of cells.values()){L.marker([cell.y/cell.count,cell.x/cell.count],{title:cell.count+' '+(lang==='he'?'רשומות — הגדלה לפרטים':'records — zoom for detail'),icon:L.divIcon({className:'potential-cluster',html:'<span>'+cell.count+'</span>',iconSize:[38,38],iconAnchor:[19,19]})}).bindTooltip(cell.count+' '+(lang==='he'?'רשומות — הגדלה לפרטים':'records — zoom for detail')).on('click',()=>map.fitBounds([[cell.extent[1],cell.extent[0]],[cell.extent[3],cell.extent[2]]],{maxZoom:14})).addTo(group);}
 }else for(const r of rows){if(!r.geometryValid||large&&!intersects(r.extent,viewport))continue;try{L.geoJSON(r.geometry,{style:{color:color(r),weight:2,fillOpacity:.2},pointToLayer:(f,ll)=>L.circleMarker(ll,{radius:8,color:'#fff',weight:2,fillColor:color(r),fillOpacity:1})}).on('click',()=>onSelect(r.id)).addTo(group);}catch{failed++;}}
 return {group,failed,overview};
}
