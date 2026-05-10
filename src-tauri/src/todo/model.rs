use serde::Serialize;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Todo {
    pub id: u32,
    pub title: String,
    pub completed: bool,
    pub created_at_ms: i64,
    pub completed_at_ms: Option<i64>,
}
