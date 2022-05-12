const router = require("express").Router();
const Cryptojs = require("crypto-js");
const Jugador = require("../models/jugador-model");
const Partido = require("../models/partido-model");
const {
  verifyTokenAndAuth,
  verifyTokenAndAdmin,
} = require("../middlewares/verifyToken");

//Actualizar Jugador
router.patch("/", verifyTokenAndAuth, async function (req, res) {
  let user = req.body;
  if (user.contrasena) {
    user.contrasena = Cryptojs.AES.encrypt(
      user.contrasena,
      process.env.PASS_SEC
    ).toString();
  }
  if (user.rol) {
    return res.status(500).json("No se puede cambiar rol");
  }
  if (!req.query.id) {
    return res.status(500).json("No hay ID de usuario");
  }
  try {
    const jugadorActualizado = await Jugador.findByIdAndUpdate(
      req.query.id,
      {
        $set: user,
      },
      { new: true }
    );
    return res.status(200).json(jugadorActualizado);
  } catch (err) {
    return res.status(500).json(err);
  }
});

//Actualizar Rol

router.patch("/rol", verifyTokenAndAdmin, async function (req, res) {
  const rol = req.body.rol;
  if (!rol) {
    return res.status(500).json("No hay ROL de usuario");
  }
  if (!req.query.id) {
    return res.status(500).json("No hay ID de usuario");
  }
  try {
    const jugadorActualizado = await Jugador.findByIdAndUpdate(
      req.query.id,
      {
        $set: {
          rol: rol,
        },
      },
      { new: true }
    );
    return res.status(200).json(jugadorActualizado);
  } catch (err) {
    return res.status(500).json(err);
  }
});

//Los Jugadores

router.get("/", verifyTokenAndAuth, async function (req, res) {
  try {
    let users = await Jugador.find();
    users = users.map((user) => {
      user.contrasena = "";
      return user;
    });
    return res.status(200).json(users);
  } catch (err) {
    return res.status(500).json(err);
  }
});

//Eliminar Jugador
router.delete("/", verifyTokenAndAdmin, async function (req, res) {
  if (!req.query.id) {
    return res.status(500).json("No hay ID de usuario");
  }
  try {
    await Jugador.findByIdAndDelete(req.query.id);
    res.status(200).json("Usuario eliminado");
  } catch (err) {
    return res.status(500).json(err);
  }
});

//Darse de baja de partido
router.delete("/partido", verifyTokenAndAuth, async function (req, response) {
  const partido = req.body;
  const idJugador = req.query.id;
  if (!partido.id) {
    return response.status(400).send({
      ok: false,
      error: "Falta id del partido",
    });
  }
  if (!idJugador) {
    return response.status(400).send({
      ok: false,
      error: "Falta id del jugador",
    });
  }
  
  // try {
    const partidoBuscado = await Partido.findById(partido.id);
    let partidoPerteneciente = "",
      equipoA,
      equipoB,
      filter = {};

    equipoA = partidoBuscado.equipoA.filter((jugador) => {
      if (jugador.id == idJugador) {
        partidoPerteneciente = "A";
        return false;
      }
      return true;
    });
    if (partidoPerteneciente != "A") {
      equipoB = partidoBuscado.equipoB.filter((jugador) => {
        if (jugador.id == idJugador) {
          console.log("es B")
          partidoPerteneciente = "B";
          return false;
        }
        return true;
      });
    }
    if (partidoPerteneciente == "") {
      return response.status(400).send({
        ok: false,
        error: "Jugador no convocado",
      });
    }
    if (partido.suplenteId) {
      partidoPerteneciente == "A" && equipoA.push({ id: partido.suplenteId });
      partidoPerteneciente == "B" && equipoB.push({ id: partido.suplenteId });
    }
    partidoPerteneciente == "A" && (filter.equipoA = equipoA);
    partidoPerteneciente == "B" && (filter.equipoB = equipoB);
    const partidoActualizado = await Partido.findByIdAndUpdate(
      partido.id,
      {
        $set: filter,
      },
      { new: true }
    );
    return response.status(200).json(partidoActualizado);
  // } catch (err) {
  //   return res.status(500).json(err);
  // }
});

module.exports = router;
