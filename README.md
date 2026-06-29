# Tomcat Runner

Run, manage, and deploy Spring Boot, Java, and Maven projects on Apache Tomcat — directly from VS Code.

Tomcat Runner adds a dedicated panel to the Activity Bar for registering local Tomcat installations, controlling their lifecycle, and deploying build artifacts to them, without ever leaving the editor.

## Features

- Manage multiple Tomcat servers, each with its own name, color, and HTTP port
- Start, stop, and restart servers from the sidebar, the status bar, or the Command Palette
- Deploy a Maven-built WAR with one command — right-click `pom.xml` and select **Deploy to Tomcat**
- View live, per-server logs in dedicated Output channels
- Open a running server in your browser with one click
- Undeploy individual applications, or clear all deployed apps from a server
- Server configurations persist across editor restarts

## Requirements

- A local Apache Tomcat installation (the folder containing `bin/`, `conf/`, `lib/`, and `webapps/`)
- Apache Maven (`mvn`) on your `PATH`, or configured via settings, if you plan to build and deploy Maven projects
- A Java Development Kit, referenced by `JAVA_HOME`

## Getting Started

1. Open the **Tomcat** icon in the Activity Bar.
2. Click **Add Server**.
3. Fill in the form:
   - **Server Name** — a label for this server, such as "Local Dev"
   - **Color** — pick a color to tell servers apart at a glance
   - **Tomcat Folder** — browse to your Apache Tomcat installation root
   - **HTTP Port** — the port Tomcat listens on
   - **Java Home** _(optional)_ — overrides the system `JAVA_HOME` for this server only
   - **CATALINA_OPTS** _(optional)_ — extra JVM arguments, such as `-Xmx2g`
4. Click **Save Server**.
5. Click the **Start** button next to your new server in the sidebar.
6. Once running, click the server, or use **Open in Browser**, to view it.

## Deploying a Project

There are three ways to deploy:

- **From the Explorer** — right-click `pom.xml` in a Maven project, or right-click a pre-built `.war` or `.jar` file, and select **Deploy to Tomcat**.
- **From the sidebar** — right-click a server and select **Deploy to Tomcat**, then choose the project folder to build.
- **From the Command Palette** — run **Tomcat: Deploy to Tomcat** and follow the prompts.

When deploying from `pom.xml`, the extension runs `mvn clean package -DskipTests` and streams the build output to the Output panel. You will then be asked to confirm the context path the application should be deployed under, for example `myapp`, which becomes available at `http://localhost:<port>/myapp/`.

Spring Boot projects packaged as a fat JAR (`<packaging>jar</packaging>` with the Spring Boot Maven plugin) embed their own server and cannot be deployed to an external Tomcat. Run those with `java -jar`, or change the project to `<packaging>war</packaging>` if you want it to run inside Tomcat.

## Managing Deployed Applications

Each server in the sidebar expands to show its deployed applications. From there you can:

- Click an application to open it in the browser
- Right-click an application and select **Undeploy** to remove it
- Right-click a server and select **Clean Webapps Folder** to remove every deployed application at once (Tomcat's built-in apps, such as `manager` and `docs`, are preserved)

## Viewing Logs

Right-click any server and select **View Logs** to open its dedicated Output channel. Each server's `catalina` process output streams here in real time, separate from every other server's log.

## Editing or Removing a Server

Right-click a server in the sidebar to **Edit Server** or **Remove Server**. If the server is currently running, you will be asked to stop it first — configuration changes should not be applied while a server is live.

Removing a server only removes it from VS Code. Your Tomcat installation and its files are left untouched.

## Commands

All commands are available from the Command Palette under the **Tomcat** category:

| Command                      | Description                                    |
| ---------------------------- | ---------------------------------------------- |
| Tomcat: Add Tomcat Server    | Register a new Tomcat installation             |
| Tomcat: Edit Server          | Change a server's settings                     |
| Tomcat: Remove Server        | Remove a server from the list                  |
| Tomcat: Start                | Start a server                                 |
| Tomcat: Stop                 | Stop a server                                  |
| Tomcat: Restart              | Stop and start a server                        |
| Tomcat: Open in Browser      | Open the server's URL in your browser          |
| Tomcat: View Logs            | Show the server's Output channel               |
| Tomcat: Deploy to Tomcat     | Build and deploy a project                     |
| Tomcat: Undeploy             | Remove a deployed application                  |
| Tomcat: Clean Webapps Folder | Remove all deployed applications from a server |
| Tomcat: Refresh              | Refresh the server list                        |

## Settings

| Setting                               | Default   | Description                                                                                  |
| ------------------------------------- | --------- | -------------------------------------------------------------------------------------------- |
| `tomcatRunner.javaHome`               | _(empty)_ | Overrides `JAVA_HOME` for Tomcat processes. Leave blank to use the system `JAVA_HOME`.       |
| `tomcatRunner.mavenExecutable`        | `mvn`     | Path to the Maven executable. Defaults to whatever is on your `PATH`.                        |
| `tomcatRunner.autoOpenBrowserOnStart` | `false`   | Automatically opens the browser when a server finishes starting.                             |
| `tomcatRunner.shutdownTimeoutMs`      | `15000`   | How long, in milliseconds, to wait for a graceful shutdown before force-killing the process. |

## Known Limitations

- Tomcat Runner does not edit `server.xml`. The HTTP port you enter is recorded for building browser URLs; it must already match what your Tomcat installation is configured to listen on.
- Only `.war` artifacts can be deployed to an external Tomcat. Spring Boot fat JARs are intentionally rejected.

## Release Notes

### 1.0.0

Initial release: server management, lifecycle control, Maven build and deploy, per-server logs, and webapps cleanup.
