# Database

Nunba uses SQLite for all local storage. No external database server is needed.

## Database Files

| File | Purpose | Tables |
|------|---------|--------|
| `hevolve_database.db` | Main app database | Agents, chat history, actions, goals |
| `nunba_social.db` | Social features | Users, posts, comments, likes, follows |
| `memory_graph/` | Agent memory | FTS5 full-text search, memory links |

Default location: `~/Documents/Nunba/data/`

Override with: `HEVOLVE_DB_PATH=<path>` in `.env`

## Initialization

On first startup, `main.py` handles database creation:

```python
# 1. Create all tables (SQLAlchemy create_all)
init_db()

# 2. Run incremental migrations (16 versions)
run_migrations()
```

### Migration System

Nunba uses a simple versioned migration system (not Alembic for the social DB):

| Version | Change |
|---------|--------|
| v1-v10 | Initial tables, indexes, social features |
| v11 | Add `tags` column to posts |
| v12 | Add `pinned` column to posts |
| v13 | Add `resonance_level` to users |
| v14 | Add `notification_preferences` |
| v15 | Add `role` column (central/regional/flat) |
| v16 | Add `is_hidden` to posts and comments |

!!! warning "Important"
    `SQLAlchemy.create_all()` creates missing **tables** but does NOT add new **columns** to existing tables. That's why the migration system exists. If you add a new column to a model, write a migration.

## Backup

The databases are plain SQLite files. To back up:

```bash
cp ~/Documents/Nunba/data/hevolve_database.db ~/backup/
cp ~/Documents/Nunba/data/nunba_social.db ~/backup/
```

## Reset

To start fresh, delete the data directory:

```bash
rm -rf ~/Documents/Nunba/data/
# Restart Nunba — databases will be recreated
python main.py
```
