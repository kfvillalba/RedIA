import React from "react";
import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <div className="rounded-b-lg shadow-lg flex place-content-center lg:w-1/2 mx-auto py-3 bg-azul-oscuro text-white sm:w-full">
      <button className="btn__nav__active ">
        <Link to="/">Datos de Entrada</Link>
      </button>
      <button className="btn__nav">
        <Link to="/entrenamiento">Entrenamiento</Link>
      </button>
      <button className="btn__nav">
        <Link to="/simulacion">Simulacion</Link>
      </button>
    </div>
  );
};

export default Navbar;
