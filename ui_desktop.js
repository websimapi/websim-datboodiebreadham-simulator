export const DesktopUI = {
  drawDesktopBackground(model) {
    const ctx = model.ctx;
    const P = {
      'Dawn':{t:'grad',a:'#2b5876',b:'#4e4376'},
      'Horizon Lines':{t:'lines'},
      'Low Poly Peaks':{t:'peaks'},
      'Blueprint':{t:'blue'},
      'Retro Sun':{t:'sun'},
      'Paper':{t:'paper'},
      'Starfield':{t:'stars'},
      'Waves':{t:'waves'},
      'Hex Mesh':{t:'hex'},
      'Circuit':{t:'circuit'}
    };
    if (P[model.activeBackground]) { this.drawPreset(ctx, model, P[model.activeBackground]); return; }
    switch (model.activeBackground) {
      case 'Classic': {
        const g = ctx.createLinearGradient(0, 0, 0, model.height);
        g.addColorStop(0, '#005f9e'); g.addColorStop(1, '#00c3ff');
        ctx.fillStyle = g; ctx.fillRect(0, 0, model.width, model.height);
        break;
      }
      case 'Midnight':
        ctx.fillStyle = '#0b0b0b'; ctx.fillRect(0, 0, model.width, model.height); break;
      case 'Soft Grid': {
        ctx.fillStyle = '#111'; ctx.fillRect(0, 0, model.width, model.height);
        ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1;
        const step = 24;
        for (let x = 0.5; x < model.width; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, model.height); ctx.stroke(); }
        for (let y = 0.5; y < model.height; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(model.width, y); ctx.stroke(); }
        break;
      }
    }
  },

  drawStartMenu(model) {
    const ctx = model.ctx;
    const menuWidth = 150, menuHeight = 200, menuX = 2, menuY = model.height - 40 - menuHeight;
    ctx.fillStyle = '#c0c0c0'; ctx.fillRect(menuX, menuY, menuWidth, menuHeight);
    ctx.strokeRect(menuX, menuY, menuWidth, menuHeight);
    const settingsY = menuY;
    ctx.fillStyle = 'black'; ctx.font = '16px Arial'; ctx.textAlign = 'left';
    ctx.fillText('Settings', menuX + 25, settingsY + 20);
    ctx.fillStyle = '#000080'; ctx.fillRect(menuX + 5, settingsY + 8, 16, 16);
  },

  drawPreset(ctx, model, p){
    const w=model.width,h=model.height;
    if(p.t==='grad'){const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,p.a);g.addColorStop(1,p.b);ctx.fillStyle=g;ctx.fillRect(0,0,w,h);return;}
    if(p.t==='lines'){ctx.fillStyle='#0e0e10';ctx.fillRect(0,0,w,h);ctx.strokeStyle='rgba(255,255,255,0.08)';for(let i=0;i<h;i+=18){ctx.beginPath();ctx.moveTo(0,i);ctx.lineTo(w,i);ctx.stroke();}}
    else if(p.t==='peaks'){ctx.fillStyle='#0b0d14';ctx.fillRect(0,0,w,h);const draw=(y,col,amp)=>(()=>{ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(0,h);for(let x=0;x<=w;x+=20){const t=x*0.01;ctx.lineTo(x,h-y- Math.abs(Math.sin(t)*amp)-Math.random()*3);}ctx.lineTo(w,h);ctx.closePath();ctx.fill();})();draw(180,'#1c293a',40);draw(130,'#24364c',30);draw(90,'#2e4460',22);}
    else if(p.t==='blue'){ctx.fillStyle='#0b1b34';ctx.fillRect(0,0,w,h);ctx.strokeStyle='rgba(173,216,230,0.15)';for(let x=0.5;x<w;x+=24){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}for(let y=0.5;y<h;y+=24){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}}
    else if(p.t==='sun'){const g=ctx.createLinearGradient(0,h*0.2,0,h);g.addColorStop(0,'#1a1040');g.addColorStop(1,'#0a0a12');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);const r=h*0.22;const cx=w*0.5,cy=h*0.45;for(let i=0;i<12;i++){ctx.fillStyle=`rgba(255,120,80,${0.25-i*0.02})`;ctx.beginPath();ctx.arc(cx,cy,r-i*6,0,Math.PI*2);ctx.fill();}ctx.strokeStyle='rgba(255,0,120,0.25)';for(let y=cy+r+10;y<h;y+=18){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}}
    else if(p.t==='paper'){ctx.fillStyle='#f5f3ef';ctx.fillRect(0,0,w,h);const id=ctx.createImageData(w,h);for(let i=0;i<id.data.length;i+=4){const n=236+((Math.random()*8)|0);id.data[i]=n;id.data[i+1]=n;id.data[i+2]=n;id.data[i+3]=20;}ctx.putImageData(id,0,0);}
    else if(p.t==='stars'){ctx.fillStyle='#0a0c10';ctx.fillRect(0,0,w,h);ctx.fillStyle='rgba(255,255,255,0.9)';for(let i=0;i<140;i++){const x=Math.random()*w,y=Math.random()*h,s=Math.random()*2;ctx.fillRect(x,y,s,s);}}
    else if(p.t==='waves'){ctx.fillStyle='#0d1320';ctx.fillRect(0,0,w,h);ctx.strokeStyle='rgba(255,255,255,0.08)';for(let y=h*0.3;y<h;y+=18){ctx.beginPath();for(let x=0;x<=w;x+=12){const a=Math.sin((x+y)*0.02)*4;ctx.lineTo(x,y+a);}ctx.stroke();}}
    else if(p.t==='hex'){ctx.fillStyle='#0e0e11';ctx.fillRect(0,0,w,h);ctx.strokeStyle='rgba(255,255,255,0.06)';const s=18;const r=s/2;for(let y=0;y<h+s;y+=s*0.86){for(let x=((y/s|0)%2)*r;x<w+s;x+=s){ctx.beginPath();for(let i=0;i<6;i++){const a=Math.PI/3*i;const px=x+r*Math.cos(a),py=y+r*Math.sin(a);i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();ctx.stroke();}}}
    else if(p.t==='circuit'){ctx.fillStyle='#0b0f13';ctx.fillRect(0,0,w,h);ctx.strokeStyle='rgba(0,173,255,0.25)';for(let i=0;i<90;i++){const x=Math.random()*w,y=Math.random()*h,l=20+Math.random()*80;ctx.beginPath();ctx.moveTo(x,y);Math.random()<0.5?ctx.lineTo(x+l,y):ctx.lineTo(x,y+l);ctx.stroke();}ctx.fillStyle='rgba(0,173,255,0.18)';for(let i=0;i<60;i++){ctx.beginPath();ctx.arc(Math.random()*w,Math.random()*h,2,0,Math.PI*2);ctx.fill();}}
  }
};