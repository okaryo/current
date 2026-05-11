use serde::Serialize;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkLog {
    pub id: u32,
    pub body: String,
    pub created_at_ms: i64,
}
