use serde::Serialize;

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Todo {
    pub id: u32,
    pub title: String,
    pub completed: bool,
    pub created_at_ms: i64,
    pub completed_at_ms: Option<i64>,
    pub parent_id: Option<u32>,
    pub position: i64,
}
