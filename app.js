const express = require("express");
const bodyParser = require("body-parser");
const query = require("./db.js");

const router = express();
const port = 8080;
const argon2 = require("argon2");

// ------------------------------------------middleware bodyparser------------------------------------
router.use(bodyParser.json());

router.get("/", (req, res) => {
  res.send("Hello world");
});

// -------------------------------------------------get all users----------------------------------------------------

router.get("/users", async (req, res) => {
  const result = await query("select * from users");
  if (result.rowCount === 0) {
    return res.send("aucun utilisateur trouvé");
  }
  res.send(result.rows);
});

router.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

// --------------------------------------------------get an user--------------------------------------------------
router.get("/users/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).send("L'id doit être un entier.");
  }
  const result = await query("select * from users where id = $1", [id]);
  if (result.rowCount === 0) {
    return res.status(404).send("utilisateur non trouvé");
  }
  res.send(result.rows[0]);
});
// ----------------------------------------------------create a new user--------------------------------------------------------
router.post("/users", async (req, res) => {
  const { user_name, email, password } = req.body;
  if (!user_name && !email && !password) {
    return res
      .status(400)
      .send("veuillez entrer un nom, une adresse email et un mot de passe");
  } else if (!user_name) {
    return res.status(400).send("veuillez entrer un nom");
  } else if (!email) {
    return res.status(400).send("veuillez entrer une adresse email ");
  } else if ((user_name.length < 3) ^ (user_name.length > 25)) {
    return res.status().send("Le doit avoir entre 3 et 25 caractères inclus");
  }
  if (
    !/^(?=.*\d)(?=.*[A-Z])(?=.*[a-z])(?=.*[^\w\d\s:])([^\s]){8,16}$/.test(
      password
    )
  ) {
    const errpwd = "Le mot de passe ne respecte pas les critères requis";
    return res.status(400).send({ message: errpwd });
  } else if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
    const errmail = "l'adresse email ne respecte pas les critères requis";
    return res.status(400).send({ message: errmail });
  }
  const userExist = await query(
    "select * from users where name = $1 AND email = $2",
    [user_name, email]
  );
  if (userExist.rowCount === 1) {
    return res.status(409).send("l'utilisateur existe deja");
  }
  try {
    const hashpassword = await argon2.hash(password);

    const result = await query(
      "INSERT INTO users (user_name, email, password) VALUES ($1, $2, $3) RETURNING *",
      [user_name, email, hashpassword]
    );
    res.status(200).send(result.rows[0]);
  } catch (err) {
    res.status(500).send("Erreur");
    console.error(err);
  }
});

router.post("/signin", async (req, res) => {
  const { email, password } = req.body;
  if (!email ^ !password) {
    return res
      .status(400)
      .send("Veuillez entrez une adresse email et un mot de passe");
  }

  if (!/^(?=.*\d)(?=.*[A-Z])(?=.*[a-z])(?=.*[^\w\d\s:])([^\s]){8,16}$/.test(password)
  ) {
    const errpwd = "Mot de passe invalide";
    return res.status(400).send({ message: errpwd });
  } else if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
    const errmail = "Adresse email invalide";
    return res.status(400).send({ message: errmail });
  }

  try {
    const userExist = await query("select password from users where email = $1",[email]);
     if (userExist.rowCount === 0) {
      return res.status(404).send("l'utilisateur n'existe pas");
    }
    const user = userExist.rows[0];
    
    if (await argon2.verify(user.password, password)) {
      return res.status(200).send("Connexion réussie");
    } else {
      return res.status(401).send("Mot de pass incorrect");
    }
  } catch (err) {
    res.status(500).send("Erreur systeme");
    console.error(err);
  }
});


router.get("/articles", async (req, res) => {
  try {
    const result = await query("SELECT * FROM articles");
    
    if (result.rowCount === 0) {
      return res.status(404).send("Articles non trouvés");
    }
    return res.status(200).send(result.rows);
    
  } catch (err) {
    console.error(err);
    return res.status(500).send("Erreur");
  }
});



router.get("/articles/:id", async (req, res) => {

try {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).send("L'ID de l'article doit être un entier.");
  }
  const result = await query("SELECT article FROM articles WHERE id_article = $1", [id]);
  if (result.rowCount === 0) {
    return res.status(404).send("Article non trouvé");
  }
  return res.status(200).send(result.rows[0]);
  
} catch (err) {
  console.error(err);
  return res.status(500).send("Erreur serveur");
}
});
