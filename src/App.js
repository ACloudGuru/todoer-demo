import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';

import Amplify, { Auth, API, graphqlOperation  } from 'aws-amplify';
import { withAuthenticator } from 'aws-amplify-react';

import * as queries from './graphql/queries';
import * as mutations from './graphql/mutations';
import * as subscriptions from './graphql/subscriptions';

import aws_exports from './aws-exports';

Amplify.configure(aws_exports);

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      items: [ ]
    }
  }

  logout = () => {
    Auth.signOut();
    window.location.reload();
  }

  getTodos = async () => {
    const result = await API.graphql(graphqlOperation(queries.listTodos));

    this.setState({items: result.data.listTodos.items});
  }

  addTodo = async () => {
    const createTodoInput = { input: {name: this.refs.newTodo.value, status: "NEW"} };

    await API.graphql(graphqlOperation(mutations.createTodo, createTodoInput));

    this.refs.newTodo.value = '';
  }

  componentDidMount() {
    this.getTodos();

    API.graphql(graphqlOperation(subscriptions.onCreateTodo))
      .subscribe({
        next: (result) => {
          const items = this.state.items;

          items.push(result.value.data.onCreateTodo);
          this.setState({items: items});
        }
      });

    API.graphql(graphqlOperation(subscriptions.onUpdateTodo))
      .subscribe({
        next: (result) => {
          const items = this.state.items;
          const todo = result.value.data.onUpdateTodo;

          const idx = items.findIndex(itm => itm.id === todo.id);
          items[idx] = todo;

          this.setState({items: items});
        }
      })
  }

  render() {
    return (
      <div className="App">
        <main>
          <h1>TODO List</h1>
          <TodoList items={this.state.items} />
          <input type="text" ref="newTodo" />
          <button onClick={this.addTodo}>Add Todo</button>
        </main>
        <button onClick={this.logout}>Log Out</button>
      </div>
    );
  }
}

class TodoList extends Component {
  render() {
    return (
      <div className="TodoList">
        <ul>
          {
            this.props.items.map( (itm, i) => {
              return <TodoItem item={itm} key={i} />
            })
          }
        </ul>
      </div>
    )
  }
}

class TodoItem extends Component {
  updateTodoStatus = async (evt) => {
    const item = this.props.item;
    const todoStatus = evt.target.checked ? "DONE" : "NOT DONE";

    const updateTodoInput = { input: {id: item.id, name: item.name, status: todoStatus }};
    await API.graphql(graphqlOperation(mutations.updateTodo, updateTodoInput));
  }
  render() {
    const item = this.props.item;

    return (
      <li>
        <input type="checkbox" checked={item.status === 'DONE'} onChange={this.updateTodoStatus}/>
        {item.name}
      </li>
    )
  }
}

export default withAuthenticator(App);
