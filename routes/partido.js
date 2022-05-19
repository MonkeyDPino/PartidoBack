const router = require("express").Router();
const Cryptojs = require("crypto-js");
const Partido = require("../models/partido-model");
const Jugador = require("../models/jugador-model");
const {
  verifyTokenAndAuth,
  verifyTokenAndAdmin,
  verifyToken,
} = require("../middlewares/verifyToken");
const { ParesImpares,SegundaOpcion,sendEmail,sendEmailToAllPlayers } = require("../algoritmos");

//Crear partido
router.post("/", verifyTokenAndAdmin, async function (req, response) { 
  let continuar = true;
  const partidos = await Partido.find();

  partidos.map((partido) => {
    if ((partido.estado == "Creado") | (partido.estado == "EquiposGenerados")) {
      continuar = false;
    }
  });

  if (!continuar) {
    return response.status(400).json({
      ok: false,
      error: "Ya hay un partido en juego",
    });
  }

  const partido = req.body;

  if (!partido.fecha) {
    return response.status(400).send({
      ok: false,
      error: "Falta fecha",
    });
  }
  if (!partido.lugar) {
    return response.status(400).send({
      ok: false,
      error: "Falta lugar",
    });
  }
  if (partido.lista || partido.equipoA || partido.equipoB) {
    return response.status(400).send({
      ok: false,
      error: "No se pueden agregar listas",
    });
  }

  const newPartido = new Partido(partido);
  let retorno = {}
  await newPartido.save(async (err, result) => {
    if (err) return response.status(500).send({ err });
    retorno.partido = result
    const notificaciones = await sendEmailToAllPlayers("Creación de partido","El administrador ha creado un nuevo partido ¡Atento pues!")
    retorno.notificaciones = notificaciones
    return response.status(500).send(retorno)
  });
});

//Actualizar fecha y/o lugar de partido
router.patch("/", verifyTokenAndAdmin, async function (req, response) {
  const partido = req.body;
  let filtro = {};
  if (!partido.id) {
    return response.status(400).send({
      ok: false,
      error: "Falta id del partido",
    });
  }
  if (!partido.fecha && !partido.lugar) {
    return response.status(400).send({
      ok: false,
      error: "Faltan Parametros",
    });
  }
  if (partido.fecha) {
    filtro.fecha = partido.fecha;
  }
  if (partido.lugar) {
    filtro.lugar = partido.lugar;
  }

  try {
    const partidoActualizado = await Partido.findByIdAndUpdate(
      partido.id,
      {
        $set: filtro,
      },
      { new: true }
    );
    return response.status(200).json(partidoActualizado);
  } catch (err) {
    return response.status(500).json(err);
  }
});

//Agregar dato a partido
router.post("/dato", verifyTokenAndAdmin, async function (req, response) {
  const partido = req.body;
  if (!partido.id) {
    return response.status(400).send({
      ok: false,
      error: "Falta id del partido",
    });
  }
  if (!partido.llave) {
    return response.status(400).send({
      ok: false,
      error: "Falta llave de dato",
    });
  }
  if (!partido.valor) {
    return response.status(400).send({
      ok: false,
      error: "Falta valor de dato",
    });
  }
  try {
    const partidoActualizado = await Partido.updateOne(
      { _id: partido.id },
      {
        $addToSet: {
          datos: { llave: partido.llave, valor: partido.valor },
        },
      },
      { new: true }
    );
    return response.status(200).json(partidoActualizado);
  } catch (err) {
    return response.status(500).json(err);
  }
});

//modificar dato de partido

router.patch("/dato", verifyTokenAndAdmin, async function (req, response) {
  const cuerpo = req.body;
  if (!cuerpo.id) {
    return response.status(400).send({
      ok: false,
      error: "Falta id del partido",
    });
  }
  if (!cuerpo.idDato) {
    return response.status(400).send({
      ok: false,
      error: "Falta id de dato",
    });
  }
  if (!cuerpo.llave) {
    return response.status(400).send({
      ok: false,
      error: "Falta llave de dato",
    });
  }
  if (!cuerpo.valor) {
    return response.status(400).send({
      ok: false,
      error: "Falta valor de dato",
    });
  }
  try {
    const partidoActualizado = await Partido.updateOne(
      { _id: cuerpo.id, "datos._id": cuerpo.idDato },
      {
        $set: {
          "datos.$.llave": cuerpo.llave,
          "datos.$.valor": cuerpo.valor,
        },
      },
      { new: true }
    );
    return response.status(200).json(partidoActualizado);
  } catch (err) {
    return response.status(500).json(err);
  }
});

//confirmar partido
router.patch("/confirmar", verifyTokenAndAdmin, async function (req, response) {
  const partido = req.body;
  if (!partido.id) {
    return response.status(400).send({
      ok: false,
      error: "Falta id del partido",
    });
  }
  try {
    let retorno = {}
    const partidoActualizado = await Partido.findByIdAndUpdate(
      partido.id,
      {
        $set: {
          estado: "Confirmado",
        },
      },
      { new: true }
    );
    retorno.partidoActualizado = partidoActualizado
    const notificaciones = await sendEmailToAllPlayers("Partido Confirmado","El administrador ha confirmado un partido")
    retorno.notificaciones = notificaciones
    return response.status(200).json(retorno);
  } catch (err) {
    return response.status(500).json(err);
  }
});

//partidos
router.get("/", verifyToken, async (req, res) => {
  try {
    const partidos = await Partido.find();

    return res.status(200).json(partidos);
  } catch (err) {
    return res.status(500).json(err);
  }
});

//partido
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const partido = await Partido.findOne({ _id: req.params.id });
    return res.status(200).json(partido);
  } catch (err) {
    return res.status(500).json(err);
  }
});

//Cancelar partido
router.delete("/", verifyTokenAndAdmin, async function (req, response) {
  const partido = req.body;
  if (!partido.id) {
    return response.status(400).send({
      ok: false,
      error: "Falta id del partido",
    });
  }
  try {
    const partidoActualizado = await Partido.findByIdAndUpdate(
      partido.id,
      {
        $set: {
          estado: "Cancelado",
        },
      },
      { new: true }
    );
    return response.status(200).json(partidoActualizado);
  } catch (err) {
    return response.status(500).json(err);
  }
});

//Crear lista de participantes
router.post("/lista",verifyTokenAndAdmin,async function (req, response) {
    const partido = req.body;
    if (!partido.id) {
      return response.status(400).send({
        ok: false,
        error: "Falta id del partido",
      });
    }
    try {
      const users = await Jugador.find();
      const usersId = [];
      users.map((user) => {
        if (user.tipo == "Frecuente") {
          usersId.push({
            id: user._id.toString(),
          });
        }
      });
      const partidoActualizado = await Partido.findByIdAndUpdate(
        partido.id,
        {
          $set: {
            lista: usersId,
          },
        },
        { new: true }
      );
      return response.status(200).json(partidoActualizado);
    } catch (e) {
      return response.status(500).json(err);
    }
  }
);

//Quitar jugador de lista
router.delete("/lista/:id",verifyTokenAndAdmin,async function (req, response) {
    const partido = req.body;
    const jugadorId = req.params.id;

    if (!partido.id) {
      return response.status(400).send({
        ok: false,
        error: "Falta id del partido",
      });
    }
    if (!jugadorId) {
      return response.status(400).send({
        ok: false,
        error: "Falta id del jugador",
      });
    }
    try {
      const partidoBuscado = await Partido.findById(partido.id);

      const listaNueva = partidoBuscado.lista.filter((jugador) => {
        jugador.id != jugadorId;
      });

      const partidoActualizado = await Partido.findByIdAndUpdate(partido.id, {
        $set: {
          lista: listaNueva,
        },
      });
      return response.status(200).json(partidoActualizado);
    } catch (err) {
      return response.status(500).send({
        ok: false,
        error: err,
      });
    }
  }
);

//agregar jugador a lista
router.patch("/lista/:id", verifyTokenAndAdmin, async function (req, response) {
  const partido = req.body;
  const jugadorId = req.params.id;

  if (!partido.id) {
    return response.status(400).send({
      ok: false,
      error: "Falta id del partido",
    });
  }
  if (!jugadorId) {
    return response.status(400).send({
      ok: false,
      error: "Falta id del jugador",
    });
  }
  try {
    const partidoBuscado = await Partido.findById(partido.id);
    let continuar = true;
    partidoBuscado.lista.map((jugador) => {
      if (jugador.id === jugadorId) continuar = false;
    });

    if (!continuar) {
      return response.status(400).json({
        ok: false,
        error: "Ya esta el jugador en la lista",
      });
    }

    const partidoActualizado = await Partido.findByIdAndUpdate(partido.id, {
      $addToSet: {
        lista: { id: jugadorId },
      },
    });
    return response.status(200).json(partidoActualizado);
  } catch (err) {
    return response.status(500).send({
      ok: false,
      error: err,
    });
  }
});

//crear equipos
router.post("/equipos", verifyTokenAndAdmin, async function (req, response) {
  const partido = req.body;
  if (!partido.id) {
    return response.status(400).send({
      ok: false,
      error: "Falta id del partido",
    });
  }

  if (!partido.criterio || !["promedioGlobal", "promedioLastMatch"].includes(partido.criterio) ) {
    return response.status(400).send({
      ok: false,
      error: "criterio no válido",
    });
  }

  if ( !partido.algoritmo || !["ParesImpares", "SegundaOpcion"].includes(partido.algoritmo)) {
    return response.status(400).send({
      ok: false,
      error: "algoritmo no válido",
    });
  }

  try {
    const partidoBuscado = await Partido.findById(partido.id);
    if (partidoBuscado.lista.length != 10) {
      return response.status(400).send({
        ok: false,
        error: "lista incompleta",
      });
    }
    const lista = partidoBuscado.lista.map((doc) => {
      return doc.id;
    });

    const jugadores = await Jugador.find({ _id: { $in: lista } });

    const equipos =
      partido.algoritmo == "ParesImpares"
        ? ParesImpares(partido.criterio, jugadores)
        : SegundaOpcion(partido.criterio, jugadores);

    equipos.estado = "EquiposGenerados";

    const partidoActualizado = await Partido.findByIdAndUpdate(
      partido.id,
      {
        $set: equipos,
      },
      { new: true }
    );
    return response.status(200).json(partidoActualizado);
  } catch (err) {
    return response.status(500).send({
      ok: false,
      error: err,
    });
  }
});

//Cambiar jugadores de equipo
router.patch("/equipos",verifyTokenAndAdmin, async function (req, response){
  const partido = req.body;
  if (!partido.id) {
    return response.status(400).send({
      ok: false,
      error: "Falta id del partido",
    });
  }
  if (!partido.idJugador1) {
    return response.status(400).send({
      ok: false,
      error: "Falta id del jugador",
    });
  }
  if (!partido.idJugador2) {
    return response.status(400).send({
      ok: false,
      error: "Falta id del jugador",
    });
  }

  try {
    const partidoBuscado = await Partido.findById(partido.id);

    if (partidoBuscado.lista.length != 10) {
      return response.status(400).send({
        ok: false,
        error: "La lista está incompleta",
      });
    }
    let equipoA = [],
      equipoB = [];
    for (let i = 0; i <= 4; i++) {
      equipoA.push(partidoBuscado.equipoA[i].id);
      equipoB.push(partidoBuscado.equipoB[i].id);
    }

    if (equipoB.includes(partido.idJugador1) ||equipoA.includes(partido.idJugador2)) {
      return response.status(400).send({
        ok: false,
        error: "El jugador ya esta en ese equipo",
      });
    }
    if (!equipoB.includes(partido.idJugador2) || !equipoA.includes(partido.idJugador1)) {
      return response.status(400).send({
        ok: false,
        error: "El jugador no esta en ese equipo",
      });
    }

    equipoA = partidoBuscado.equipoA.filter(
      (jugador) => jugador.id != partido.idJugador1
    );
    equipoB = partidoBuscado.equipoB.filter(
      (jugador) => jugador.id != partido.idJugador2
    );
    equipoA.push({
      id: partido.idJugador2,
    });
    equipoB.push({
      id: partido.idJugador1,
    });

    const partidoActualizado = await Partido.findByIdAndUpdate(
      partido.id,
      {
        $set: {
          equipoA,
          equipoB
        },
      },
      { new: true }
    );
    return response.status(200).json(partidoActualizado);
  } catch (err) {
    return response.status(500).send({
      ok: false,
      error: err,
    });
  } 
})

//calificar jugadores
router.post("/calificaciones",verifyToken, async function (req, response){
  const partido = req.body
  if (!partido.id) {
    return response.status(400).send({
      ok: false,
      error: "Falta id del partido",
    });
  }
  if (!partido.calificaciones) {
    return response.status(400).send({
      ok: false,
      error: "Faltan las calificaciones del partido",
    });
  }
  try {
    let arrayJugadoresCalificados = [];
    let arraypromesas = [];
    partido.calificaciones.map(async (cal) => {
      const promesa = Jugador.findByIdAndUpdate(
        cal.idJugador,
        {
          $addToSet: {
            calificaciones: {
              num: cal.num,
              comentario: cal.comentario,
              fecha: new Date,
            },
          },
        },
        { new: true }
      ).then((jugador) => arrayJugadoresCalificados.push(jugador));
      arraypromesas.push(promesa);
    });
    Promise.all(arraypromesas)
      .then(function (results) {
        return response.status(200).json(arrayJugadoresCalificados);
      })
      .catch((err) => {
        return response.status(500).send({
          ok: false,
          error: err,
        });
      });
  } catch (err) {
    return response.status(500).send({
      ok: false,
      error: err,
    });
  }

})


module.exports = router;
