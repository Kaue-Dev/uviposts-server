const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Conexão com o banco de dados MySQL
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'kaue2004',
  database: 'uviposts',
});

db.connect((err) => {
  if (err) throw err;
  console.log('Conectado ao banco de dados MySQL!');
});

// Rota para criar um novo usuário
app.post('/usuarios', (req, res) => {
  const { nome, email, senha, genero, biografia } = req.body;
  
  const query = 'INSERT INTO usuario (nome, email, senha, genero, biografia, numero_de_postagens) VALUES (?, ?, ?, ?, ?, ?)';
  const values = [nome, email, senha, genero, biografia, 0]; // número de postagens inicializado como 0

  db.query(query, values, (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: err.message })
    };
    res.status(201).json({ message: 'Usuário criado com sucesso!', usuarioId: result.insertId });
  });
});

// Rota para listar todos os usuários
app.get('/usuarios', (req, res) => {
  const query = 'SELECT * FROM usuario';
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Rota para listar todos os posts
app.get('/posts', (req, res) => {
  const query = 'SELECT * FROM post';
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Rota para listar todos os comentários
app.get('/comentarios', (req, res) => {
  const query = 'SELECT * FROM comentarios';
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Rota para deletar um usuário pelo ID
app.delete('/usuarios/:id', (req, res) => {
  const { id } = req.params;

  const query = 'DELETE FROM usuario WHERE id = ?';

  db.query(query, [id], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    res.status(200).json({ message: 'Usuário deletado com sucesso!' });
  });
});

// Rota para criar um post
app.post('/posts', (req, res) => {
  const { titulo_do_post, texto_do_post, postado_por } = req.body;

  // Primeiro, cria o post
  const queryPost = 'INSERT INTO post (titulo_do_post, texto_do_post, postado_por, numero_de_curtidas) VALUES (?, ?, ?, 0)';
  
  db.query(queryPost, [titulo_do_post, texto_do_post, postado_por, JSON.stringify([])], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }

    // Após a criação do post, atualiza o número de postagens do usuário
    const queryUsuario = 'UPDATE usuario SET numero_de_postagens = numero_de_postagens + 1 WHERE id = ?';
    
    db.query(queryUsuario, [postado_por], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: err.message });
      }

      res.status(201).json({ message: 'Post criado e número de postagens atualizado com sucesso!' });
    });
  });
});

// Rota para aumentar o número de curtidas de um post
app.post('/posts/:id/curtir', (req, res) => {
  const { id } = req.params;

  // Atualiza o número de curtidas, incrementando em 1
  const query = 'UPDATE post SET numero_de_curtidas = numero_de_curtidas + 1 WHERE id = ?';

  db.query(query, [id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Post não encontrado.' });
    }

    res.status(200).json({ message: 'Curtida adicionada com sucesso!' });
  });
});

// Rota para deletar um post e atualizar o número de posts do usuário
app.delete('/posts/:id', (req, res) => {
  const postId = req.params.id;

  // Primeiro, buscamos o ID do usuário que criou o post
  const getUserQuery = 'SELECT postado_por FROM post WHERE id = ?';

  db.query(getUserQuery, [postId], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Erro ao buscar o post." });
    }
    
    if (result.length === 0) {
      // Nenhum post foi encontrado com o ID fornecido
      return res.status(404).json({ message: "Post não encontrado." });
    }

    const userId = result[0].postado_por;

    // Em seguida, deletamos o post
    const deletePostQuery = 'DELETE FROM post WHERE id = ?';

    db.query(deletePostQuery, [postId], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Erro ao deletar o post." });
      }

      // Agora, atualizamos o número de posts do usuário
      const updateUserQuery = 'UPDATE usuario SET numero_de_postagens = numero_de_postagens - 1 WHERE id = ?';

      db.query(updateUserQuery, [userId], (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: "Erro ao atualizar o número de posts do usuário." });
        }

        res.status(200).json({ message: "Post deletado e número de posts do usuário atualizado com sucesso!" });
      });
    });
  });
});

// Rota para criar um comentário em um post
app.post('/comentarios', (req, res) => {
  const { texto_do_comentario, comentado_por, post_id } = req.body;

  // Valida se os campos necessários foram fornecidos
  if (!texto_do_comentario || !comentado_por || !post_id) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios." });
  }

  // Consulta SQL para inserir o comentário na tabela `comentarios`
  const insertCommentQuery = 'INSERT INTO comentarios (texto_do_comentario, comentado_por, post_id) VALUES (?, ?, ?)';

  db.query(insertCommentQuery, [texto_do_comentario, comentado_por, post_id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Erro ao criar o comentário." });
    }

    const newComment = {
      id: result.insertId,
      texto_do_comentario,
      comentado_por,
    };

    res.status(201).json({ message: "Comentário criado com sucesso!", comentarioId: newComment.id });
  });
});

// Rota para deletar um comentário pelo ID
app.delete('/comentarios/:id', (req, res) => {
  const { id } = req.params;

  // Consulta SQL para deletar o comentário com o ID especificado
  const deleteCommentQuery = 'DELETE FROM comentarios WHERE id = ?';

  db.query(deleteCommentQuery, [id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Erro ao deletar o comentário." });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Comentário não encontrado." });
    }

    res.status(200).json({ message: "Comentário deletado com sucesso!" });
  });
});

// Rota para atualizar o texto e o título de um post
app.put('/posts/:id', (req, res) => {
  const { id } = req.params;
  const { texto_do_post, titulo_do_post } = req.body;

  // Valida se os campos necessários foram fornecidos
  if (!texto_do_post || !titulo_do_post) {
    return res.status(400).json({ error: "Os campos 'texto_do_post' e 'titulo_do_post' são obrigatórios." });
  }

  // Consulta SQL para atualizar o texto e o título do post
  const updatePostQuery = 'UPDATE post SET texto_do_post = ?, titulo_do_post = ? WHERE id = ?';

  db.query(updatePostQuery, [texto_do_post, titulo_do_post, id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Erro ao atualizar o post." });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Post não encontrado." });
    }

    res.status(200).json({ message: "Post atualizado com sucesso!" });
  });
});

// Inicializa o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
