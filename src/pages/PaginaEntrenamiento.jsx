import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import TableDrawer from "../components/TableDrawer";
import { collection, onSnapshot, query, sum } from "firebase/firestore";
import { db } from "../components/firebase";

import { Line } from "react-chartjs-2";
import { parse } from "postcss";
import { push } from "firebase/database";

const PaginaEntrenamiento = () => {
  // firebase
  const [dataForm, setDataform] = useState([]);

  //variables useState

  const [selectedItem, SetSelectecItem] = useState(-1);
  const dataItem = dataForm[selectedItem];

  //variables

  let count = 1;
  let pause = false;
  let ultimosPesos = [];
  let ultimoUmbral = [];
  let ERS = [];

  //Funciones
  const getPatrones = (matriz, numEntradas) => {
    let matrizNueva = [];
    matriz.map((item) => {
      matrizNueva.push(item.slice(0, numEntradas));
    });

    return convertirMatrizANumeros(matrizNueva);
  };
  function convertirMatrizANumeros(matriz) {
    return matriz.map((fila) => fila.map((elemento) => parseFloat(elemento)));
  }
  function convertirArrayANumeros(matriz) {
    return matriz.map((elemento) => parseFloat(elemento));
  }
  const getPesos = () => {
    let pesos = [];
    dataItem.PesosInicialesCapa3Capa4.length > 0
      ? pesos.unshift(
          convertirMatrizANumeros(dataItem.PesosInicialesCapa3Capa4)
        )
      : 0;
    dataItem.PesosInicialesCapa2Capa3.length > 0
      ? pesos.unshift(
          convertirMatrizANumeros(dataItem.PesosInicialesCapa2Capa3)
        )
      : 0;
    dataItem.PesosInicialesCapa1Capa2.length > 0
      ? pesos.unshift(
          convertirMatrizANumeros(dataItem.PesosInicialesCapa1Capa2)
        )
      : 0;
    dataItem.PesosInicialesCapa0Capa1.length > 0
      ? pesos.unshift(
          convertirMatrizANumeros(dataItem.PesosInicialesCapa0Capa1)
        )
      : 0;

    return pesos;
  };

  const getUmbrales = () => {
    let umbrales = [];

    dataItem.UmbralesInicialesCapa3Capa4[0] != ""
      ? umbrales.unshift(
          convertirArrayANumeros(dataItem.UmbralesInicialesCapa3Capa4)
        )
      : 0;
    dataItem.UmbralesInicialesCapa2Capa3[0] != ""
      ? umbrales.unshift(
          convertirArrayANumeros(dataItem.UmbralesInicialesCapa2Capa3)
        )
      : 0;
    dataItem.UmbralesInicialesCapa1Capa2[0] != ""
      ? umbrales.unshift(
          convertirArrayANumeros(dataItem.UmbralesInicialesCapa1Capa2)
        )
      : 0;
    dataItem.UmbralesInicialesCapa0Capa1[0] != ""
      ? umbrales.unshift(
          convertirArrayANumeros(dataItem.UmbralesInicialesCapa0Capa1)
        )
      : 0;

    return umbrales;
  };
  const Sigmoid = (x) => {
    return 1 / (1 + Math.exp(-x));
  };
  const sigmoidDerivada = (x) => {
    return x * (1 - x);
  };
  const Tanh = (x) => {
    return Math.tanh(x);
  };
  function tanhDerivada(x) {
    return 1 - x * x;
  }

  const ReLu = (x) => {
    return Math.max(0, x);
  };
  function reluDerivada(x) {
    return x < 0 ? 0 : 1;
  }
  function Seno(x) {
    return Math.sin(x);
  }
  function senoDerivada(x) {
    return Math.cos(x);
  }
  const getSalidas = (matriz, numEntradas) => {
    let matrizNueva = [];
    matriz.map((item) => {
      matrizNueva.push(item.slice(numEntradas));
    });
    return convertirMatrizANumeros(matrizNueva);
  };

  const calcularTotalError = (predictedOutputs, expectedOutputs) => {
    let suma = 0;
    let last = predictedOutputs.length - 1;
    predictedOutputs = predictedOutputs[last];
    for (let i = 0; i < predictedOutputs.length; i++) {
      suma += (1 / 2) * Math.pow(expectedOutputs[i] - predictedOutputs[i], 2);
    }
    return suma;
  };

  const calcularErrorIteracion = (erroresPatron) => {
    return Math.abs(
      erroresPatron.reduce((a, b) => a + b, 0) / erroresPatron.length
    );
  };
  const calcularSalida = (pesosI, umbralI, patronI, funcAct) => {
    let salidas = [];

    let patron = patronI;
    for (let index = 0; index < umbralI.length; index++) {
      let salidasTemp = [];
      let pesos = pesosI[index];
      let umbral = umbralI[index];

      for (let i = 0; i < pesos.length; i++) {
        let suma = 0;
        for (let j = 0; j < umbral.length; j++) {
          suma += patron[j] * pesos[i][j];
        }

        suma += umbral[i];

        let salida;
        switch (funcAct) {
          case "Sigmoid":
            salida = Sigmoid(suma);
            break;
          case "Tanh":
            salida = Tanh(suma);
            break;
          case "ReLU":
            salida = ReLu(suma);
            break;
          case "Sin":
            salida = Seno(suma);
            break;
        }

        salidasTemp.push(salida);
      }
      salidas.push(salidasTemp);
      patron = salidasTemp;
    }

    return salidas;
  };

  const calcularCostoPesos = (
    predictedOutputs,
    expectedOutputs,
    pesosI,
    inputs
  ) => {
    let costos = [];
    let last = predictedOutputs.length - 1;
    let lastPesos = pesosI.length - 1;
    for (let k = pesosI.length - 1; k >= 0; k--) {
      let pesosTemp = pesosI[lastPesos];
      let pesos = pesosI[k];
      let costosTemp = [];
      for (let i = 0; i < pesos.length; i++) {
        let row = [];
        let suma = 0;
        for (let j = 0; j < pesos[0].length; j++) {
          if (k == pesosI.length - 1) {
            /*  console.log(
              predictedOutputs[last][i] - expectedOutputs[i],
              "*",
              sigmoidDerivada(predictedOutputs[last][i]),
              "*",
              predictedOutputs[last - 1][j]
            ); */
            row.push(
              (predictedOutputs[last][i] - expectedOutputs[i]) *
                sigmoidDerivada(predictedOutputs[last][i]) *
                predictedOutputs[last - 1][j]
            );
          } else {
            for (let m = 0; m < predictedOutputs[last].length; m++) {
              suma +=
                (predictedOutputs[last][m] - expectedOutputs[m]) *
                sigmoidDerivada(predictedOutputs[last][m]) *
                pesosTemp[m][j] *
                (predictedOutputs[last - 1][i] *
                  (1 - predictedOutputs[last - 1][i])) *
                inputs[i];
              /*   console.log(
                predictedOutputs[last][m] - expectedOutputs[m],
                "*",
                sigmoidDerivada(predictedOutputs[last][m]),
                "*",
                pesosTemp[m][j],
                " *",
                predictedOutputs[last - 1][i] *
                  (1 - predictedOutputs[last - 1][i]),
                "*",
                inputs[i]
              ); */
            }
            row.push(suma);
          }
        }
        costosTemp.push(row);
      }

      costos.unshift(costosTemp);
    }
    return costos;
  };

  const calcularPesosNuevos = (pesosI, RataApendizaje, costosPesosI) => {
    let pesosNuevos = [];
    for (let index = 0; index < pesosI.length; index++) {
      let pesos = pesosI[index];
      let costosPesos = costosPesosI[index];
      let pesosTemp = [];
      for (let i = 0; i < pesos.length; i++) {
        let row = [];
        for (let j = 0; j < pesos[0].length; j++) {
          row.push(pesos[i][j] - RataApendizaje * costosPesos[i][j]);
        }
        pesosTemp.push(row);
      }
      pesosNuevos.push(pesosTemp);
    }
    return pesosNuevos;
  };

  function stop() {
    pause = true;
    count = 1;
  }
  function start() {
    pause = false;
    iterarWhile();
  }

  let errorIteracion = 1;
  const iterarWhile = () => {
    let predictedOutputs = [];
    let inputs = getPatrones(dataItem.MatrizInicial, dataItem.NumEntradas);
    let expectedOutputs = getSalidas(
      dataItem.MatrizInicial,
      dataItem.NumEntradas
    );
    let pesos = getPesos();
    let umbrales = getUmbrales();
    const iteraciones = dataItem.NumIteraciones;
    const errorMaximo = parseFloat(dataItem.ErrorMaximo);
    let erroresPatron = [];
    if (pause == false) {
      if ((count > iteraciones) | (errorIteracion < errorMaximo)) {
        stop();
      } else {
        console.log("Iteracion: ", count);
        inputs.map((inputs) => {
          // Calculamos las salidas
          predictedOutputs = calcularSalida(pesos, umbrales, inputs, "Sigmoid");
          //Calculamos el error del patron
          let totalError = calcularTotalError(
            predictedOutputs,
            expectedOutputs
          );

          erroresPatron.push(totalError);
          //calculamos los costos (funcion de costos)
          let costosPesos = calcularCostoPesos(
            predictedOutputs,
            expectedOutputs,
            pesos,
            inputs
          );

          //calculamos los pesos nuevos
          pesos = calcularPesosNuevos(pesos, 0.6, costosPesos);
          //calcularmos el error de la iteracion
          errorIteracion = calcularErrorIteracion(erroresPatron);
          //Guardamos el Error vs Iteracion
          let iteracion = { Iteracion: [count], Error: [errorIteracion] };
          ERS.push(iteracion);
          //logs

          console.log("Costos: ", costosPesos);
          console.log("Pesos: ", pesos);
          console.log("Entardas: ", inputs);
          console.log("Salidas Predecidas: ", predictedOutputs);
          console.log("Salidas Esperadas: ", expectedOutputs);
          console.log("ERS: ", ERS[ERS.length - 1].Error);
        });
        count++;
      }
      setTimeout(iterarWhile, 1);
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
        item.UmbralesInicialesCapa0Capa1 = JSON.parse(
          item.UmbralesInicialesCapa0Capa1
        );

        item.PesosInicialesCapa0Capa1 = JSON.parse(
          item.PesosInicialesCapa0Capa1
        );
        item.PesosInicialesCapa1Capa2
          ? (item.PesosInicialesCapa1Capa2 = JSON.parse(
              item.PesosInicialesCapa1Capa2
            ))
          : 0;
        item.UmbralesInicialesCapa1Capa2
          ? (item.UmbralesInicialesCapa1Capa2 = JSON.parse(
              item.UmbralesInicialesCapa1Capa2
            ))
          : 0;
        item.PesosInicialesCapa2Capa3
          ? (item.PesosInicialesCapa2Capa3 = JSON.parse(
              item.PesosInicialesCapa2Capa3
            ))
          : 0;
        item.UmbralesInicialesCapa2Capa3
          ? (item.UmbralesInicialesCapa2Capa3 = JSON.parse(
              item.UmbralesInicialesCapa2Capa3
            ))
          : 0;
        item.PesosInicialesCapa3Capa4
          ? (item.PesosInicialesCapa3Capa4 = JSON.parse(
              item.PesosInicialesCapa3Capa4
            ))
          : 0;
        item.UmbralesInicialesCapa3Capa4
          ? (item.UmbralesInicialesCapa3Capa4 = JSON.parse(
              item.UmbralesInicialesCapa3Capa4
            ))
          : 0;
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
                  <h1 className="text-center">Dataset</h1>
                  <div className="flex justify-evenly w-full">
                    <p className="message">Entradas: {dataItem.NumEntradas}</p>
                    <p className="message">Salidas: {dataItem.NumSalidas}</p>
                    <p className="message">Patrones: {dataItem.NumPatrones}</p>
                    <p className="message">
                      Capas Ocultas: {dataItem.NumCapasOcultas}
                    </p>
                  </div>

                  <TableDrawer data={dataItem.MatrizInicial} />
                  {/* <div className="gap-4 flex  lg:flex-row form__section">
                    <div className="flex flex-col lg:w-1/2 sm:w-screen">
                      <h1>Pesos Iniciales</h1>
                      <TableDrawer data={dataItem.PesosInicialesCapa0Capa1} />
                    </div>
                    <div className="flex flex-col lg:w-1/2 sm:w-full">
                      <h1>Umbral Inicial</h1>
                      <TableDrawer
                        data={dataItem.UmbralesInicialesCapa0Capa1}
                      />
                    </div>
                  </div>
                  <div className="gap-4 flex  lg:flex-row mt-3 form__section">
                    <div className="flex flex-col lg:w-1/2 sm:w-screen">
                      <h1>Ultimos Pesos</h1>
                      <TableDrawer data={ultimosPesos} />
                    </div>
                    <div className="flex flex-col lg:w-1/2 sm:w-full">
                      <h1>Ultimo Umbral</h1>
                      <TableDrawer data={ultimoUmbral} />
                    </div>
                  </div> */}

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
