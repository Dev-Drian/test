import { useContext, useEffect, useState } from "react";
import { WorkspaceContext } from "../context/WorkspaceContext";
import { listTables, createTable, getTableData, addTableRow } from "../api/client";
import styles from "./Tables.module.css";

export default function Tables() {
  const { workspaceId } = useContext(WorkspaceContext);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [selectedTableId, setSelectedTableId] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [rowJson, setRowJson] = useState("{}");
  const [addingRow, setAddingRow] = useState(false);
  const [rowError, setRowError] = useState("");

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    listTables(workspaceId)
      .then((res) => setTables(res.data || []))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId || !selectedTableId) {
      setTableData([]);
      return;
    }
    setLoadingData(true);
    getTableData(workspaceId, selectedTableId)
      .then((res) => setTableData(res.data || []))
      .finally(() => setLoadingData(false));
  }, [workspaceId, selectedTableId]);

  const handleCreate = (e) => {
    e.preventDefault();
    if (!name.trim() || !workspaceId) return;
    setCreating(true);
    createTable({ workspaceId, name: name.trim() })
      .then((res) => {
        setTables((prev) => [...prev, res.data]);
        setName("");
      })
      .finally(() => setCreating(false));
  };

  const handleAddRow = (e) => {
    e.preventDefault();
    if (!workspaceId || !selectedTableId) return;
    setRowError("");
    let data;
    try {
      data = JSON.parse(rowJson);
    } catch {
      setRowError("JSON no válido. Ejemplo: {\"nombre\": \"Ejemplo\", \"cantidad\": 10}");
      return;
    }
    if (typeof data !== "object" || data === null) {
      setRowError("Debe ser un objeto JSON.");
      return;
    }
    setAddingRow(true);
    addTableRow(workspaceId, selectedTableId, data)
      .then(() => {
        setRowJson("{}");
        return getTableData(workspaceId, selectedTableId);
      })
      .then((res) => setTableData(res.data || []))
      .catch((err) => setRowError(err.response?.data?.error || err.message))
      .finally(() => setAddingRow(false));
  };

  if (!workspaceId) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>Tablas</h1>
        <p className={styles.needWs}>Selecciona un workspace en Inicio o Workspaces.</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Tablas</h1>
      <p className={styles.subtitle}>
        Crea tablas para almacenar datos y vincúlalas a agentes para que el bot pueda consultarlas.
      </p>

      <form onSubmit={handleCreate} className={styles.form}>
        <input
          type="text"
          placeholder="Nombre de la tabla"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={styles.input}
          disabled={creating}
        />
        <button type="submit" className={styles.btn} disabled={creating || !name.trim()}>
          {creating ? "Creando…" : "Crear tabla"}
        </button>
      </form>

      {loading && <div className={styles.loading}>Cargando…</div>}
      {!loading && (
        <div className={styles.layout}>
          <div className={styles.sidebar}>
            {tables.map((t) => (
              <button
                key={t._id}
                type="button"
                className={`${styles.tableBtn} ${selectedTableId === t._id ? styles.tableBtnActive : ""}`}
                onClick={() => setSelectedTableId(t._id)}
              >
                {t.name}
              </button>
            ))}
            {tables.length === 0 && (
              <p className={styles.noTables}>No hay tablas. Crea una arriba.</p>
            )}
          </div>
          <div className={styles.content}>
            {selectedTableId && (
              <>
                <h3 className={styles.dataTitle}>Datos</h3>
                <div className={styles.addRowSection}>
                  <p className={styles.addRowLabel}>Añadir fila (JSON):</p>
                  <form onSubmit={handleAddRow} className={styles.addRowForm}>
                    <textarea
                      className={styles.rowTextarea}
                      value={rowJson}
                      onChange={(e) => { setRowJson(e.target.value); setRowError(""); }}
                      placeholder='{"nombre": "Ejemplo", "cantidad": 10}'
                      rows={2}
                      disabled={addingRow}
                    />
                    <button type="submit" className={styles.btn} disabled={addingRow}>
                      {addingRow ? "Añadiendo…" : "Añadir fila"}
                    </button>
                  </form>
                  {rowError && <p className={styles.rowError}>{rowError}</p>}
                </div>
                {loadingData && <p className={styles.loading}>Cargando…</p>}
                {!loadingData && (
                  <div className={styles.tableWrap}>
                    {tableData.length === 0 ? (
                      <p className={styles.emptyData}>Sin filas aún. Añade una con el formulario de arriba.</p>
                    ) : (
                      <table className={styles.dataTable}>
                        <thead>
                          <tr>
                            {Object.keys(tableData[0])
                              .filter((k) => !k.startsWith("_") && k !== "main")
                              .map((k) => (
                                <th key={k}>{k}</th>
                              ))}
                          </tr>
                        </thead>
                        <tbody>
                          {tableData.map((row, i) => (
                            <tr key={row._id || i}>
                              {Object.keys(tableData[0])
                                .filter((k) => !k.startsWith("_") && k !== "main")
                                .map((k) => (
                                  <td key={k}>{String(row[k] ?? "")}</td>
                                ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </>
            )}
            {!selectedTableId && (
              <p className={styles.hint}>Selecciona una tabla para ver sus datos.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
