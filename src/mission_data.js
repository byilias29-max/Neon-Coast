window.NC = window.NC || {};
window.NC.missions = {
  data: [
    {n:'A casa',r:200,s:[{t:'Entra en tu apartamento por la puerta (E)',g:()=>({x:429,z:129})}]},
    {n:'Bienvenida',r:200,s:[{t:'Llega a la playa (este)',g:()=>({x:EXT+18,z:0})}]},
    {n:'Reparto exprés',r:500,s:[{t:'Recoge el paquete',g:()=>ip(-3,2)},{t:'Entrégalo a tiempo',g:()=>ip(3,-3),lim:90}]},
    {n:'Primer golpe',r:800,s:[{t:'Atraca una tienda con un arma (E)',rob:1,g:()=>{let b=null,bd=1e9;for(const s of shops)if(s.cool<=0){const d=Math.hypot(s.x-P.x,s.z-P.z);if(d<bd){bd=d;b=s}}return b||ip(0,0)}},{t:'Despista a la policía',ev:1}]},
    {n:'Carrera costera',r:1000,s:[ip(-2,-3),ip(2,-3),ip(3,1),ip(0,3)].map((p,i)=>({t:'Punto de control '+(i+1)+'/4',g:()=>p,lim:32}))},
    {n:'Cazador novato',r:700,s:[{t:'Noquea a 2 peatones o polis (ataca de cerca o dispara)',kill:2}]},
    {n:'Velocidad máxima',r:600,s:[{t:'Alcanza 110 km/h en coche',speed:110}]},
    {n:'Doble golpe',r:1200,s:[{t:'Atraca 2 tiendas (E con arma)',rob:2},{t:'Escapa con 2+ estrellas y despista',ev:1,wanted:2}]},
    {n:'Repartidor incansable',r:1300,s:[{t:'Recoge en el puerto',g:()=>ip(-4,-2)},{t:'Entrega norte (60s)',g:()=>ip(1,4),lim:60},{t:'Entrega playa (60s)',g:()=>({x:EXT+18,z:20}),lim:60}]},
    {n:'Fuga extrema',r:1400,s:[{t:'Lía una (atraca o ataca) hasta 3 estrellas',wanted:3},{t:'Despista a la policía',ev:1}]},
    {n:'Inversor',r:1000,s:[{t:'Consigue $2500 en mano (atracos + misiones)',cash:2500}]},
    {n:'Tour de tiendas',r:900,s:[{t:'Visita el Super del centro',g:()=>{const s2=shops.find(q=>q.type=='Super')||shops[0];return{x:s2.x,z:s2.z}}},{t:'Visita la Armería',g:()=>{const s2=shops.find(q=>q.type=='Armeria')||shops[1];return{x:s2.x,z:s2.z}}}]},
    {n:'Tunea tu máquina',r:800,s:[{t:'Compra algo en un concesionario naranja (B)',buycar:1,g:()=>{let b=carShops[0],bd=1e9;for(const s2 of carShops){const d=Math.hypot(s2.x-P.x,s2.z-P.z);if(d<bd){bd=d;b=s2}}return{x:b.x,z:b.z}}}]},
    {n:'Dinero con rumbo',r:1500,s:[{t:'Compra el apartamento: B junto a una tienda',buy:1}]},
    {n:'Carrera nocturna',r:2500,s:[{t:'Llega al punto de inicio',g:()=>ip(0,2)},{t:'Completa el circuito en 120s',g:()=>ip(2,2),lim:120}]},
    {n:'Asalto al almacén',r:3000,s:[{t:'Ve al almacén en el puerto',g:()=>({x:-266,z:-342})},{t:'Atraca el almacén (E)',rob:1},{t:'Escapa de la zona',ev:1}]},
    {n:'Fuga final (5 estrellas)',r:5000,s:[{t:'Provoca a la policía hasta 5 estrellas',wanted:5},{t:'Despista a la policía',ev:1}]}
  ]
};
