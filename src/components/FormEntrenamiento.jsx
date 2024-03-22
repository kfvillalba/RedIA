import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, collectionGroup } from "firebase/firestore";
import { db } from "./firebase";

const FormEntrenamiento = () => {
  const Navigate = useNavigate();
  const collectionForm = collection(db, "dataForm");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();
  const [csvData, setCsvData] = useState([]);
  const [pesosIniciales, setpesosIniciales] = useState([]);
  const [umbralInicial, setumbralInicial] = useState([]);
  function getRandomArbitrary(min, max) {
    return parseFloat(Math.random() * (max - min) + min).toFixed(1);
  }

  function generarEstructura(filas, columnas, min, max) {
    const estructura = [];
    for (let i = 0; i < filas; i++) {
      const fila = [];
      for (let j = 0; j < columnas; j++) {
        fila.push(getRandomArbitrary(min, max));
      }
      estructura.push(fila);
    }
    return estructura;
  }

  const handleFileChange = (event) => {
    const file = event.target.files[0];

    if (file) {
      const reader = new FileReader();

      reader.onload = (e) => {
        const csvText = e.target.result;
        parseCSV(csvText);
      };

      reader.readAsText(file);
    }
  };

  const parseCSV = (csvText) => {
    const lines = csvText.trim().split("\n");

    const parsedData = [];

    for (let j = 0; j < lines.length; j++) {
      const valores = lines[j].trim().split(",");
      const row = valores.map((valor) => Number(valor));
      parsedData.push(row);
    }

    setCsvData(parsedData);
  };
  const onSubmit = async (data) => {
    const pesosInicialesData = generarEstructura(
      data.Entradas,
      data.Salidas,
      -1,
      1
    );
    const umbralInicialData = generarEstructura(data.Salidas, 1, -1, 1);

    setpesosIniciales(pesosInicialesData);
    setumbralInicial(umbralInicialData);

    await addDoc(collection(db, "IA-DATABASE"), {
      Nombre: data.Nombre,
      NumEntradas: data.Entradas,
      NumSalidas: data.Salidas,
      NumPatrones: data.Patrones,
      RataApendizaje: data.RataApendizaje,
      TipoEntrenamiento: data.tipoEntrenamiento,
      NumIteraciones: data.Iteraciones,
      ErrorMaximo: data.ErrorMaximo,
      MatrizInicial: JSON.stringify(csvData),
      PesosIniciales: JSON.stringify(pesosInicialesData),
      UmbralInicial: JSON.stringify(umbralInicialData),
    });

    Navigate("/entrenamiento");
    reset();
  };

  return (
    <div>
      <form
        className="p-1 mt-5 lg:w-1/2 md:w-full mx-auto border-2 border-azul-oscuro rounded-lg"
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="form__section">
          <h1 className="text-center mb-3">Cargar o Generar Datos</h1>
          <div className="Subir_Datos">
            <label className="label__form" htmlFor="user_avatar">
              Subir datos
            </label>
            <input
              onChange={handleFileChange}
              accept=".csv"
              className="block w-full py-1 text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 dark:text-gray-400 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
              aria-describedby="user_avatar_help"
              id="user_avatar"
              type="file"
            />
          </div>
        </div>
        <div className="form__section">
          <h1 className="text-center mb-3">Parametros de inicalizacion</h1>
          <div className="Nombre">
            <label htmlFor="Nombre" className="label__form ">
              Nombre del entrenamiento.
            </label>
            <input
              onWheel={(e) => e.target.blur()}
              id="Nombre"
              className="input__form"
              type="text"
              {...register("Nombre", {
                required: "Campo Obligatorio",
              })}
            />
            <b className="spam_form_error">{errors?.Entradas?.message}</b>
          </div>
          <div className="Entradas">
            <label htmlFor="Entradas" className="label__form ">
              Entradas.
            </label>
            <input
              onWheel={(e) => e.target.blur()}
              id="Entradas"
              className="input__form"
              type="number"
              {...register("Entradas", {
                valueAsNumber: true,
                required: "Campo Obligatorio",
                min: { value: 0, message: "Minimo 1 Entrada" },
              })}
            />
            <b className="spam_form_error">{errors?.Entradas?.message}</b>
          </div>
          <div className="Salidas">
            <label htmlFor="Salidas" className="label__form ">
              Salidas.
            </label>
            <input
              onWheel={(e) => e.target.blur()}
              id="Salidas"
              className="input__form"
              type="number"
              {...register("Salidas", {
                valueAsNumber: true,
                required: "Campo Obligatorio",
                min: { value: 0, message: "Minimo 1 salida" },
              })}
            />
            <b className="spam_form_error">{errors?.Salidas?.message}</b>
          </div>
          <div className="Patrones">
            <label htmlFor="Patrones" className="label__form ">
              Patrones.
            </label>
            <input
              onWheel={(e) => e.target.blur()}
              id="Patrones"
              className="input__form"
              type="number"
              {...register("Patrones", {
                valueAsNumber: true,
                required: "Campo Obligatorio",
                min: { value: 0.00001, message: "Minimo 1 patron" },
              })}
            />
            <b className="spam_form_error">{errors?.Patrones?.message}</b>
          </div>
          <div className="RataApendizaje">
            <label htmlFor="RataApendizaje" className="label__form ">
              Rata de Apendizaje.
            </label>
            <input
              onWheel={(e) => e.target.blur()}
              step={0.1}
              id="RataApendizaje"
              className="input__form"
              type="number"
              {...register("RataApendizaje", {
                valueAsNumber: true,
                required: "Campo Obligatorio",
                min: { value: 0.0000001, message: "Tiene que ser mayor que 0" },
                max: {
                  value: 0.9999999,
                  message: "Tiene que ser menor que 1 ",
                },
              })}
            />
            <b className="spam_form_error">{errors?.RataApendizaje?.message}</b>
          </div>
          <div className="tipoEntrenamiento">
            <label className="label__form" htmlFor="tipoEntrenamiento">
              Tipo de entrenamiento.
            </label>
            <select
              {...register("tipoEntrenamiento", {
                required: "Campo Obligatorio",
                min: { value: 1, message: "Seleccione un entrenamiento" },
              })}
              className="input__form"
              id="tipoEntrenamiento"
            >
              <option value="0">Seleecione un entrenamiento</option>
              <option value="1">Regla Delta</option>
            </select>
            <b className="spam_form_error">
              {errors?.tipoEntrenamiento?.message}
            </b>
          </div>
        </div>
        <div className="form__section">
          <h1 className="text-center mb-3">Parametros de Finalizacion</h1>
          <div className="Iteraciones">
            <label htmlFor="Iteraciones" className="label__form ">
              Iteraciones.
            </label>
            <input
              onWheel={(e) => e.target.blur()}
              id="Iteraciones"
              className="input__form"
              type="number"
              {...register("Iteraciones", {
                valueAsNumber: true,
                required: "Campo Obligatorio",
                min: { value: 0, message: "Minimo 1 iteracion" },
              })}
            />
            <b className="spam_form_error">{errors?.Iteraciones?.message}</b>
          </div>
          <div className="ErrorMaximo">
            <label htmlFor="ErrorMaximo" className="label__form ">
              Error Maximo.
            </label>
            <input
              onWheel={(e) => e.target.blur()}
              id="ErrorMaximo"
              className="input__form"
              type="number"
              step={0.01}
              {...register("ErrorMaximo", {
                required: "Campo Obligatorio",
                min: { value: 0, message: "El error minimo permitido es 0" },
                max: {
                  value: 0.1,
                  message: "El error maximo permitido es 0.1",
                },
              })}
            />
            <b className="spam_form_error">{errors?.ErrorMaximo?.message}</b>
          </div>
        </div>

        <button type="submit" className="btn__form">
          Enviar
        </button>
      </form>
    </div>
  );
};

export default FormEntrenamiento;
