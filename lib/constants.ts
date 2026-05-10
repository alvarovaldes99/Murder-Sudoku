export const AMBIENTES = [
  {
    name: "Mansión",
    zones: ["Salón", "Baño", "Cocina", "Biblioteca", "Jardín", "Garaje", "Sótano", "Desván", "Dormitorio", "Terraza"],
    colors: ["bg-amber-200/60", "bg-blue-200/60", "bg-cyan-200/60", "bg-orange-200/60", "bg-green-200/60", "bg-rose-200/60", "bg-violet-200/60", "bg-fuchsia-200/60", "bg-lime-200/60", "bg-teal-200/60"],
    borderColors: ["border-amber-400", "border-blue-400", "border-cyan-400", "border-orange-400", "border-green-400", "border-rose-400", "border-violet-400", "border-fuchsia-400", "border-lime-400", "border-teal-400"],
    validProps: [
      { id: "silla", emoji: "🪑", name: "una silla", spriteRow: 0, spriteCol: 0 },
      { id: "sofa", emoji: "🛋️", name: "un sofá", spriteRow: 0, spriteCol: 1 },
      { id: "cama", emoji: "🛏️", name: "una cama", spriteRow: 0, spriteCol: 2 },
      { id: "alfombra", emoji: "🔲", name: "una alfombra", spriteRow: 0, spriteCol: 3 },
      { id: "taburete", emoji: "🪑", name: "un taburete", spriteRow: 0, spriteCol: 4 }
    ],
    blockers: [
      { id: "planta", emoji: "🪴", name: "una planta", spriteRow: 1, spriteCol: 0 },
      { id: "tele", emoji: "📺", name: "un televisor", spriteRow: 1, spriteCol: 1 },
      { id: "caja", emoji: "📦", name: "una caja", spriteRow: 1, spriteCol: 2 },
      { id: "libreria", emoji: "📚", name: "una librería", spriteRow: 1, spriteCol: 3 },
      { id: "estatua", emoji: "🗽", name: "una estatua", spriteRow: 1, spriteCol: 4 }
    ]
  },
  {
    name: "Parque",
    zones: ["Paseo", "Merendero", "Estanque", "Bosque", "Entrada", "Juegos", "Kiosco", "Mirador", "Glorieta", "Pistas"],
    colors: ["bg-stone-300/60", "bg-orange-300/60", "bg-cyan-300/60", "bg-green-400/60", "bg-yellow-200/60", "bg-red-200/60", "bg-violet-300/60", "bg-fuchsia-300/60", "bg-lime-300/60", "bg-teal-300/60"],
    borderColors: ["border-stone-500", "border-orange-500", "border-cyan-500", "border-green-600", "border-yellow-500", "border-red-400", "border-violet-500", "border-fuchsia-500", "border-lime-500", "border-teal-500"],
    validProps: [
      { id: "banco", emoji: "🪵", name: "un banco", spriteRow: 0, spriteCol: 0 },
      { id: "manta", emoji: "🟪", name: "una manta de picnic", spriteRow: 0, spriteCol: 1 },
      { id: "toalla", emoji: "🟩", name: "una toalla", spriteRow: 0, spriteCol: 2 },
      { id: "parrilla", emoji: "🥩", name: "una pequeña parrilla", spriteRow: 0, spriteCol: 3 },
      { id: "tumbona", emoji: "🪑", name: "una tumbona", spriteRow: 0, spriteCol: 4 }
    ],
    blockers: [
      { id: "arbol", emoji: "🌳", name: "un árbol", spriteRow: 1, spriteCol: 0 },
      { id: "flores", emoji: "🌺", name: "unas flores", spriteRow: 1, spriteCol: 1 },
      { id: "fuente", emoji: "⛲", name: "una fuente", spriteRow: 1, spriteCol: 2 },
      { id: "roca", emoji: "🪨", name: "una roca", spriteRow: 1, spriteCol: 3 },
      { id: "papelera", emoji: "🗑️", name: "una papelera", spriteRow: 1, spriteCol: 4 }
    ]
  },
  {
    name: "Iglesia",
    zones: ["Altar", "Nave", "Coro", "Sacristía", "Cripta", "Entrada", "Campanario", "Claustro", "Bautisterio", "Capilla"],
    colors: ["bg-yellow-100/80", "bg-stone-200/80", "bg-amber-100/80", "bg-orange-100/80", "bg-slate-300/80", "bg-red-100/80", "bg-violet-200/80", "bg-fuchsia-200/80", "bg-lime-200/80", "bg-teal-200/80"],
    borderColors: ["border-yellow-400", "border-stone-400", "border-amber-400", "border-orange-400", "border-slate-500", "border-red-300", "border-violet-400", "border-fuchsia-400", "border-lime-400", "border-teal-400"],
    validProps: [
      { id: "banco_iglesia", emoji: "🪑", name: "un banco", spriteRow: 0, spriteCol: 0 },
      { id: "alfombra_roja", emoji: "🟥", name: "una alfombra roja", spriteRow: 0, spriteCol: 1 },
      { id: "reclinatorio", emoji: "🧎", name: "un reclinatorio", spriteRow: 0, spriteCol: 2 }
    ],
    blockers: [
      { id: "vela", emoji: "🕯️", name: "una vela", spriteRow: 1, spriteCol: 0 },
      { id: "pila", emoji: "💧", name: "una pila bautismal", spriteRow: 1, spriteCol: 1 },
      { id: "campana", emoji: "🔔", name: "una campana", spriteRow: 1, spriteCol: 2 },
      { id: "estatua", emoji: "🗿", name: "una estatua", spriteRow: 1, spriteCol: 3 },
      { id: "flores", emoji: "💐", name: "unas flores", spriteRow: 0, spriteCol: 3 }
    ]
  },
  {
    name: "Tienda",
    zones: ["Escaparate", "Caja", "Probadores", "Pasillo", "Almacén", "Aseo", "Oficina", "Recepción", "Cafetería", "Vestuario"],
    colors: ["bg-blue-100/80", "bg-green-100/80", "bg-pink-100/80", "bg-purple-100/80", "bg-gray-200/80", "bg-teal-100/80", "bg-violet-100/80", "bg-fuchsia-100/80", "bg-lime-100/80", "bg-rose-100/80"],
    borderColors: ["border-blue-400", "border-green-400", "border-pink-400", "border-purple-400", "border-gray-400", "border-teal-400", "border-violet-400", "border-fuchsia-400", "border-lime-400", "border-rose-400"],
    validProps: [
      { id: "alfombra_azul", emoji: "🟦", name: "una alfombra", spriteRow: 0, spriteCol: 0 },
      { id: "taburete", emoji: "🪜", name: "un taburete", spriteRow: 0, spriteCol: 1 },
      { id: "silla", emoji: "🪑", name: "una silla", spriteRow: 0, spriteCol: 3 }
    ],
    blockers: [
      { id: "mostrador", emoji: "🗄️", name: "un mostrador", spriteRow: 0, spriteCol: 2 },
      { id: "caja_reg", emoji: "🧾", name: "una caja registradora", spriteRow: 1, spriteCol: 0 },
      { id: "maniqui", emoji: "🧍", name: "un maniquí", spriteRow: 1, spriteCol: 1 },
      { id: "perchero", emoji: "🧥", name: "un perchero", spriteRow: 1, spriteCol: 2 },
      { id: "espejo", emoji: "🪞", name: "un espejo", spriteRow: 1, spriteCol: 3 }
    ]
  }
];

export const ALL_CHARACTERS = [
  { id: "c1", name: "Ana", emoji: "👱‍♀️", spriteRow: 0, spriteCol: 0, bgColor: "bg-red-200" },
  { id: "c2", name: "Bruno", emoji: "🧔‍♂️", spriteRow: 0, spriteCol: 1, bgColor: "bg-blue-200" },
  { id: "c3", name: "Carmen", emoji: "👵", spriteRow: 0, spriteCol: 2, bgColor: "bg-green-200" },
  { id: "c4", name: "Diego", emoji: "👲", spriteRow: 0, spriteCol: 3, bgColor: "bg-yellow-200" },
  { id: "c5", name: "Elena", emoji: "🧕", spriteRow: 0, spriteCol: 4, bgColor: "bg-purple-200" },
  { id: "c6", name: "Félix", emoji: "🥸", spriteRow: 1, spriteCol: 0, bgColor: "bg-orange-200" },
  { id: "c7", name: "Gato", emoji: "🐈‍⬛", spriteRow: 1, spriteCol: 1, bgColor: "bg-pink-200" },
  { id: "c8", name: "Hugo", emoji: "👮", spriteRow: 1, spriteCol: 2, bgColor: "bg-teal-200" },
  { id: "c9", name: "Inés", emoji: "👩‍🦰", spriteRow: 1, spriteCol: 3, bgColor: "bg-amber-100" },
  { id: "c10", name: "Mario", emoji: "🧑‍🍳", spriteRow: 1, spriteCol: 4, bgColor: "bg-cyan-200" }
];
