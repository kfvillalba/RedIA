import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import TableDrawer from "../components/TableDrawer";
import { collection, doc, onSnapshot, query } from "firebase/firestore";
import { db } from "../components/firebase";
import { Line } from "react-chartjs-2";

const PaginaEntrenamiento = () => {
  // firebase
  const [dataForm, setDataform] = useState([]);

  //variables useState

  const [selectedItem, SetSelectecItem] = useState(-1);
  const dataItem = dataForm[selectedItem];

  //variables

  let count = 0;
  let pause = false;
  let errorIteracion = 1;
  let salidasPatron = [];
  let pesosNuevos = [];
  let umbralNuevo = [];
  let ultimosPesos = [];
  let ultimoUmbral = [];
  let erroresPatron = [];
  let erroresLineales = [];
  let historialIteraciones = [];
  let historialErroresIteracion = [];

  //Funciones
  const getPatrones = (matriz, numEntradas) => {
    let matrizNueva = [];
    matriz.map((item) => {
      matrizNueva.push(item.slice(0, numEntradas));
    });
    return matrizNueva;
  };
  const getSalidas = (matriz, numEntradas) => {
    let matrizNueva = [];
    matriz.map((item) => {
      matrizNueva.push(item.slice(numEntradas));
    });
    return matrizNueva;
  };

  const calcularSalidas = (
    salidasOriginales,
    pesos,
    patron,
    umbrales,
    numEntradas,
    numSalidas,
    rataAprendizaje,
    indexMap
  ) => {
    let sumatoria = 0;
    let tempsalidas = [];

    for (let j = 0; j < numSalidas; j++) {
      for (let i = 0; i < numEntradas; i++) {
        sumatoria += patron[i] * pesos[i][j];
      }
      sumatoria -= umbrales[j];
      tempsalidas.push(funcionActivacion(sumatoria));
    }

    let tempErrorLineal = calcularErrorLineal(
      salidasOriginales,
      tempsalidas,
      indexMap
    );

    pesosNuevos = calcularPesosNuevos(
      numEntradas,
      numSalidas,
      pesos,
      rataAprendizaje,
      tempErrorLineal,
      patron
    );
    umbralNuevo = calcularUmbralNuevo(
      numEntradas,
      numSalidas,
      umbrales,
      rataAprendizaje,
      tempErrorLineal,
      patron
    );
    ultimosPesos = pesosNuevos;
    ultimoUmbral = umbralNuevo;

    salidasPatron.push(tempsalidas);
    erroresLineales.push(tempErrorLineal);
  };

  const funcionActivacion = (salida) => {
    if (salida >= 0) {
      return 1;
    }
    return 0;
  };

  const calcularErrorLineal = (arr1, arr2, index) =>
    arr1[0].map(function (num, idx) {
      return num - arr2[idx];
    });

  const calcularErrorPatron = (Salidas) => {
    erroresLineales.map((item) => {
      erroresPatron.push(Math.abs(item.reduce((a, b) => a + b, 0) / Salidas));
    });
  };
  const calcularErrorIteracion = (Patrones) => {
    errorIteracion = Math.abs(
      erroresPatron.reduce((a, b) => a + b, 0) / Patrones
    );
    historialErroresIteracion.push(errorIteracion);
  };

  const calcularPesosNuevos = (
    numEntradas,
    numSalidas,
    pesos,
    rataAprendizaje,
    errorLineal,
    patron
  ) => {
    let tempMatriz = [];
    for (let j = 0; j < numEntradas; j++) {
      let row = [];
      for (let i = 0; i < numSalidas; i++) {
        row.push(
          parseFloat(pesos[j][i]) + rataAprendizaje * errorLineal[i] * patron[j]
        );
      }
      tempMatriz.push(row);
    }

    return tempMatriz;
  };

  const calcularUmbralNuevo = (
    numEntradas,
    numSalidas,
    umbral,
    rataAprendizaje,
    errorLineal,
    patron
  ) => {
    let tempMatriz = [];
    for (let j = 0; j < numSalidas; j++) {
      let row = [];
      for (let i = 0; i < 1; i++) {
        row.push(
          parseFloat(umbral[j][i]) + rataAprendizaje * errorLineal[j] * 1
        );
      }
      tempMatriz.push(row);
    }

    return tempMatriz;
  };
  const onStop = () => {};

  function stop() {
    pause = true;
  }
  function start() {
    pause = false;
    iterarWhile();
  }
  const iterarWhile = () => {
    let patronesRed = getPatrones(dataItem.MatrizInicial, dataItem.NumEntradas);
    let salidasRed = getSalidas(dataItem.MatrizInicial, dataItem.NumEntradas);
    if (count == 0) {
      pesosNuevos = dataItem.PesosIniciales;
      umbralNuevo = dataItem.UmbralInicial;
    }
    const iteraciones = dataItem.NumIteraciones;
    const errorMaximo = parseFloat(dataItem.ErrorMaximo);
    if (pause == false) {
      if (count == iteraciones || errorIteracion <= errorMaximo) {
        pause = true;
      } else {
        console.log(
          "P:",
          pesosNuevos,
          "U",
          umbralNuevo,
          "E",
          erroresPatron,
          "S",
          salidasRed
        );
        patronesRed.map((patron, index) => {
          calcularSalidas(
            salidasRed,
            pesosNuevos,
            patron,
            umbralNuevo,
            dataItem.NumEntradas,
            dataItem.NumSalidas,
            dataItem.RataApendizaje,
            index
          );
        });
        calcularErrorPatron(dataItem.NumSalidas);
        calcularErrorIteracion(dataItem.NumPatrones);
        count++;
        erroresPatron = [];
        erroresLineales = [];
        historialIteraciones.push(count);
      }

      setTimeout(iterarWhile, 100);
    }
  };

  useEffect(() => {
    const q = query(collection(db, "IA-DATABASE"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      let docArray = [];
      querySnapshot.forEach((doc) => {
        docArray.push({ ...doc.data(), id: doc.id });
      });
      docArray.map((item) => {
        item.MatrizInicial = JSON.parse(item.MatrizInicial);
        item.UmbralInicial = JSON.parse(item.UmbralInicial);
        item.PesosIniciales = JSON.parse(item.PesosIniciales);
      });
      setDataform(docArray);
    });

    return () => unsubscribe();
  }, []);

  // ejecucion de funciones

  return (
    <div>
      <Navbar />
      <div className=" p-3 border-2 border-azul-oscuro lg:w-1/2 sm:w-full m-3 mx-auto rounded-lg">
        {dataForm ? (
          <div>
            <div className="form__section">
              <ul>
                {dataForm.map((item, index) => (
                  <li key={index}>
                    <button
                      value={index}
                      className="btn__list"
                      onClick={(e) => {
                        SetSelectecItem(e.target.value);
                      }}
                    >
                      {item.Nombre}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="form__section">
              {selectedItem != -1 ? (
                <div>
                  <h1 className="text-center">Matriz Inicial</h1>
                  <p className="message">
                    Entradas: {dataItem.NumEntradas} | Salidas:{" "}
                    {dataItem.NumSalidas} | Patrones: {dataItem.NumPatrones}
                  </p>
                  <TableDrawer data={dataItem.MatrizInicial} />
                  <div className="gap-4 flex  lg:flex-row ">
                    <div className="flex flex-col lg:w-1/2 sm:w-screen">
                      <h1>Pesos Iniciales</h1>
                      <TableDrawer data={dataItem.PesosIniciales} />
                    </div>
                    <div className="flex flex-col lg:w-1/2 sm:w-full">
                      <h1>Umbral Inicial</h1>
                      <TableDrawer data={dataItem.UmbralInicial} />
                    </div>
                  </div>
                  <div>
                    <Line
                      datasetIdKey="id"
                      data={{
                        labels: historialIteraciones,
                        datasets: [
                          {
                            label: "Error",
                            data: historialErroresIteracion,
                          },
                        ],
                      }}
                    ></Line>
                  </div>
                  <div className="flex gap-4">
                    <button
                      onClick={() => {
                        start();
                      }}
                      className="btn__form "
                    >
                      Empezar
                    </button>
                    <button
                      onClick={() => {
                        stop();
                      }}
                      className="hover:bg-red-900 btn__form bg-red-950"
                    >
                      Detener
                    </button>
                  </div>
                </div>
              ) : (
                <p className="message">Seleccione un Entrenamiento</p>
              )}
            </div>
          </div>
        ) : (
          <p className="message">Llene el formuario en "Datos de Entrada"</p>
        )}
      </div>
    </div>
  );
};

export default PaginaEntrenamiento;
