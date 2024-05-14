import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import TableDrawer from "../components/TableDrawer";
import { collection, onSnapshot, query, sum } from "firebase/firestore";
import { db } from "../components/firebase";
import { useForm } from "react-hook-form";

const PaginaSimulacion = () => {
  // firebase
  const [dataForm, setDataform] = useState([]);
  const [csvData, setCsvData] = useState([]);
  //variables useState

  const [selectedItem, SetSelectecItem] = useState(-1);
  const dataItem = dataForm[selectedItem];

  //variables

  let count = 1;
  let pause = false;
  let ultimosPesos = [];
  let ultimoUmbral = [];
  let ERS = [];
  const [registroEntradas, setRegistroEntradas] = useState([1]);

  //Funciones
  const handleEntradas = () => {
    let array = [];
    for (let index = 0; index < dataItem.NumEntradas; index++) {
      array.push(index + 1);
    }
    setRegistroEntradas(array);
  };
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
    dataItem.PesosInicialesCapa3Capa4[0] != ""
      ? pesos.unshift(
          convertirMatrizANumeros(dataItem.PesosInicialesCapa3Capa4)
        )
      : 0;
    dataItem.PesosInicialesCapa2Capa3[0] != ""
      ? pesos.unshift(
          convertirMatrizANumeros(dataItem.PesosInicialesCapa2Capa3)
        )
      : 0;
    dataItem.PesosInicialesCapa1Capa2[0] != ""
      ? pesos.unshift(
          convertirMatrizANumeros(dataItem.PesosInicialesCapa1Capa2)
        )
      : 0;
    dataItem.PesosInicialesCapa0Capa1[0] != ""
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
  const calcularSalida = (pesosI, umbralInicial, patronI, funcAct) => {
    /*     let patron = patronI;
    pesosI.map((pesos, index) => {
      let salidas = [];
      let umbral = umbralInicial[index];
      console.log(pesos, umbral);
      patron = salidas;
      pesos.map((columna, col) => {
        let suma = 0;
        suma += umbral[col];
        let salida = Sigmoid(suma);
        salidas.push(salida);
        console.log(salidas);
        columna.map((fila, fil) => {
          console.log(patron[col], "*", pesos[col][fil]);
        });
      });
    }); */
    let patron = patronI;
    let salidas = [];
    for (let index = 0; index < umbralInicial.length; index++) {
      let pesos = pesosI[index];
      let umbral = umbralInicial[index];
      let salidasTemp = [];
      for (let i = 0; i < pesos.length; i++) {
        let suma = 0;
        for (let j = 0; j < pesos[0].length; j++) {
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
    inputs,
    funcAct
  ) => {
    let costos = [];
    let last = predictedOutputs.length - 1;
    let lastPesos = pesosI.length - 1;
    for (let k = pesosI.length - 1; k >= 0; k--) {
      console.log(pesosI);
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
            switch (funcAct) {
              case "Sigmoid":
                row.push(
                  (predictedOutputs[last][i] - expectedOutputs[i]) *
                    sigmoidDerivada(predictedOutputs[last][i]) *
                    predictedOutputs[last - 1][j]
                );
                break;
              case "Tanh":
                row.push(
                  (predictedOutputs[last][i] - expectedOutputs[i]) *
                    tanhDerivada(predictedOutputs[last][i]) *
                    predictedOutputs[last - 1][j]
                );
                break;
              case "ReLU":
                row.push(
                  (predictedOutputs[last][i] - expectedOutputs[i]) *
                    reluDerivada(predictedOutputs[last][i]) *
                    predictedOutputs[last - 1][j]
                );
                break;
            }
          } else {
            for (let m = 0; m < predictedOutputs[last].length; m++) {
              switch (funcAct) {
                case "Sigmoid":
                  suma +=
                    (predictedOutputs[last][m] - expectedOutputs[m]) *
                    sigmoidDerivada(predictedOutputs[last][m]) *
                    pesosTemp[m][j] *
                    (predictedOutputs[last - 1][i] *
                      (1 - predictedOutputs[last - 1][i])) *
                    inputs[i];
                  break;
                case "Tanh":
                  suma +=
                    (predictedOutputs[last][m] - expectedOutputs[m]) *
                    tanhDerivada(predictedOutputs[last][m]) *
                    pesosTemp[m][j] *
                    (predictedOutputs[last - 1][i] *
                      (1 - predictedOutputs[last - 1][i])) *
                    inputs[i];
                  break;
                case "ReLU":
                  suma +=
                    (predictedOutputs[last][m] - expectedOutputs[m]) *
                    reluDerivada(predictedOutputs[last][m]) *
                    pesosTemp[m][j] *
                    (predictedOutputs[last - 1][i] *
                      (1 - predictedOutputs[last - 1][i])) *
                    inputs[i];
                  break;
              }

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
    const iteraciones = 1;
    const errorMaximo = parseFloat(dataItem.ErrorMaximo);
    let erroresPatron = [];
    if (pause == false) {
      if ((count > iteraciones) | (errorIteracion < errorMaximo)) {
        stop();
      } else {
        console.log(inputs);
        inputs.map((inputs) => {
          // Calculamos las salidas
          predictedOutputs = calcularSalida(pesos, umbrales, inputs, "Tanh");
          //Calculamos el error del patron
          console.log(
            "Salidas Predecidas: ",
            predictedOutputs[predictedOutputs.length - 1]
          );
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
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm();
  const onSubmit = async (data) => {
    console.log(data);
  };
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
                        console.log(dataForm);
                        SetSelectecItem(e.target.value);
                        setCsvData(
                          getPatrones(
                            dataForm[e.target.value].MatrizInicial,
                            dataForm[e.target.value].NumEntradas
                          )
                        );
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

                  <div className="form__section mt-3">
                    <h1 className="text-center mb-3">
                      Cargar Datos de Entrada
                    </h1>
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
                  <form onSubmit={handleSubmit(onSubmit)}>
                    {registroEntradas.map}
                  </form>

                  <TableDrawer data={csvData} />

                  <div className="flex gap-4">
                    <button
                      onClick={() => {
                        start();
                      }}
                      className="btn__form "
                    >
                      Simular
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

export default PaginaSimulacion;
