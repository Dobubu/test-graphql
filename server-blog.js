const express = require("express");
const { ApolloServer, gql } = require("apollo-server-express");
const model = require("./model/model-blog");

const typeDefs = gql`
  type Query {
    hello: String
    me: User
    users: [User]
    user(name: String!): User
    posts: [Post]
    post(id: ID!): Post
  }

  type User {
    id: ID!
    email: String!
    name: String
    age: Int
    friends: [User]
    posts: [Post]
  }

  type Post {
    id: ID!
    author: User
    title: String
    body: String
    likeGivers: [User]
    createdAt: String
  }

  input UpdateMyInfoInput {
    name: String
    age: Int
  }

  input AddPostInput {
    title: String
    body: String
  }

  type Mutation {
    updateMyInfo(input: UpdateMyInfoInput!): User
    addFriend(userId: ID!): User
    addPost(input: AddPostInput!): Post
    likePost(postId: ID!): Post
  }
`;

const resolvers = {
  Query: {
    hello: () => "Hello world!",
    me: () => model.findUserByUserId(model.meId),
    users: () => model.getUsers(),
    user: (root, { name }, context) => model.findUserByName(name),
    posts: () => model.getPosts(),
    post: (root, { id }, context) => model.findPostByPostId(id),
  },
  User: {
    posts: (parent, args, context) => model.filterPostsByUserId(parent.id),
    friends: (parent, args, context) =>
      model.filterUsersByUserIds(parent.friendIds || []),
  },
  Post: {
    author: (parent, args, context) => model.findUserByUserId(parent.authorId),
    likeGivers: (parent, args, context) =>
      model.filterUsersByUserIds(parent.likeGiverIds),
  },
  Mutation: {
    updateMyInfo: (parent, { input }, context) => {
      const data = ["name", "age"].reduce(
        (obj, key) => (input[key] ? { ...obj, [key]: input[key] } : obj),
        {}
      );

      return model.updateUserInfo(model.meId, data);
    },
    addFriend: (parent, { userId }, context) => {
      const me = model.findUserByUserId(meId);

      if (me.friendIds.include(userId))
        throw new Error(`User ${userId} Already Friend.`);

      const friend = model.findUserByUserId(userId);
      const newMe = model.updateUserInfo(meId, {
        friendIds: me.friendIds.concat(userId),
      });
      model.updateUserInfo(userId, {
        friendIds: friend.friendIds.concat(meId),
      });

      return newMe;
    },
    addPost: (parent, { input }, context) => {
      const { title, body } = input;

      return model.addPost({ authorId: model.meId, title, body });
    },
    likePost: (parent, { postId }, context) => {
      const post = model.findPostByPostId(postId);

      if (!post) throw new Error(`Post ${postId} Not Exists`);

      if (!post.likeGiverIds.includes(postId)) {
        return model.updatePost(postId, {
          likeGiverIds: post.likeGiverIds.concat(model.meId),
        });
      }

      return model.updatePost(postId, {
        likeGiverIds: post.likeGiverIds.filter((id) => id === meId),
      });
    },
  },
};

const server = new ApolloServer({ typeDefs, resolvers });

const app = express();
server.applyMiddleware({ app });

app.listen({ port: 4000 }, () =>
  console.log("Now browse to http://localhost:4000" + server.graphqlPath)
);
